// Cloudflare Email Worker — receives forwarded bank/credit-card alert emails at
// u_<token>@transactions.grotketech.com and hands them to the budget-tool API.
//
// It never trusts the address alone: it HMAC-signs `timestamp\ntoken\nmessageId`
// with a secret shared with PocketBase, so only this Worker can submit and a
// captured request can't be replayed (PocketBase rejects stale timestamps).
//
// Secrets (set with `wrangler secret put`):
//   INBOUND_HMAC_SECRET   — same value as the droplet's INBOUND_HMAC_SECRET
//   INBOUND_WEBHOOK_URL   — https://budget.grotketech.com/api/inbound/transaction-email

import PostalMime from "postal-mime";

const MAX_BYTES = 1024 * 1024; // 1 MB — alert emails are tiny; anything bigger is junk

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Read spf/dkim/dmarc verdicts out of the Authentication-Results header.
function parseAuth(headerValue) {
  const s = (headerValue || "").toLowerCase();
  const grab = (k) => {
    const m = s.match(new RegExp(k + "=(pass|fail|neutral|none|softfail|temperror|permerror)"));
    return m ? (m[1] === "softfail" ? "fail" : m[1]) : "unknown";
  };
  return { spf: grab("spf"), dkim: grab("dkim"), dmarc: grab("dmarc") };
}

export default {
  async email(message, env) {
    // The token is the local-part of the address the mail was sent to.
    const to = message.to || "";
    const token = to.split("@")[0].trim();
    if (!token.startsWith("u_")) return; // not one of our addresses — drop silently

    if (message.rawSize && message.rawSize > MAX_BYTES) return;

    const raw = await new Response(message.raw).arrayBuffer();
    if (raw.byteLength > MAX_BYTES) return;

    const email = await new PostalMime().parse(raw);
    const messageId =
      email.messageId || message.headers.get("message-id") || `${token}-${Date.now()}`;
    const auth = parseAuth(message.headers.get("authentication-results"));

    const body = {
      token,
      messageId,
      from: (email.from && email.from.address) || message.from || "",
      subject: email.subject || "",
      text: (email.text || "").slice(0, 100000),
      html: (email.html || "").slice(0, 200000),
      auth,
      receivedAt: new Date().toISOString(),
    };

    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = await hmacHex(env.INBOUND_HMAC_SECRET, `${ts}\n${token}\n${messageId}`);

    await fetch(env.INBOUND_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": ts,
        "X-Signature": signature,
      },
      body: JSON.stringify(body),
    });
    // We deliberately do not reject on API failure — the email is already
    // captured by Cloudflare; a transient API blip shouldn't bounce the sender.
  },
};
