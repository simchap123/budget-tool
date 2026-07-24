// Cloudflare Email Worker — dependency-free so it can be pasted straight into the
// Cloudflare dashboard editor (no wrangler/npm/bundling needed).
//
// Receives forwarded bank / credit-card alert emails at
// u_<token>@transactions.grotketech.com, parses the MIME body, and HMAC-signs a
// POST to the budget-tool webhook. It never trusts the address alone — it signs
// `timestamp\ntoken\nmessageId` with a secret shared with PocketBase so only this
// Worker can submit and a captured request can't be replayed.
//
// Secrets (Settings → Variables in the dashboard, or `wrangler secret put`):
//   INBOUND_HMAC_SECRET   — same value as the droplet's INBOUND_HMAC_SECRET
//   INBOUND_WEBHOOK_URL   — https://budget.grotketech.com/api/inbound/transaction-email

const MAX_BYTES = 1024 * 1024;

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseAuth(v) {
  const s = (v || "").toLowerCase();
  const grab = (k) => {
    const m = s.match(new RegExp(k + "=(pass|fail|neutral|none|softfail|temperror|permerror)"));
    return m ? (m[1] === "softfail" ? "fail" : m[1]) : "unknown";
  };
  return { spf: grab("spf"), dkim: grab("dkim"), dmarc: grab("dmarc") };
}

function decodeQP(str) {
  return String(str)
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function decodeB64(str) {
  try { return decodeURIComponent(escape(atob(String(str).replace(/\s+/g, "")))); }
  catch (e) { try { return atob(String(str).replace(/\s+/g, "")); } catch (e2) { return ""; } }
}
function htmlToText(html) {
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#36;|&dollar;/gi, "$")
    .replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// Decode one MIME part's body given its headers.
function decodeBody(headers, body) {
  const cte = (headers["content-transfer-encoding"] || "").toLowerCase();
  if (cte.includes("base64")) return decodeB64(body);
  if (cte.includes("quoted-printable")) return decodeQP(body);
  return body;
}
function splitHeaders(block) {
  const idx = block.search(/\r?\n\r?\n/);
  const rawHead = idx >= 0 ? block.slice(0, idx) : block;
  const body = idx >= 0 ? block.slice(idx).replace(/^\r?\n\r?\n/, "") : "";
  const headers = {};
  rawHead.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (m) headers[m[1].toLowerCase()] = m[2];
  });
  return { headers, body };
}

// Best-effort: pull a plain-text and/or html body out of a raw MIME message.
function parseEmail(raw) {
  const { headers, body } = splitHeaders(raw);
  const ct = headers["content-type"] || "";
  let text = "", html = "";
  const bm = ct.match(/boundary="?([^";]+)"?/i);
  if (/multipart\//i.test(ct) && bm) {
    const parts = body.split("--" + bm[1]);
    for (const part of parts) {
      if (!part.trim() || part.trim() === "--") continue;
      const p = splitHeaders(part.replace(/^\r?\n/, ""));
      const pct = (p.headers["content-type"] || "").toLowerCase();
      const decoded = decodeBody(p.headers, p.body);
      if (pct.includes("text/plain") && !text) text = decoded;
      else if (pct.includes("text/html") && !html) html = decoded;
      else if (/multipart\//.test(pct)) {
        const inner = parseEmail(part.replace(/^\r?\n/, "")); // nested multipart
        text = text || inner.text; html = html || inner.html;
      }
    }
  } else {
    const decoded = decodeBody(headers, body);
    if (/text\/html/i.test(ct)) html = decoded; else text = decoded;
  }
  return {
    subject: headers["subject"] || "",
    messageId: (headers["message-id"] || "").trim(),
    text, html,
  };
}

export default {
  async email(message, env) {
    const to = message.to || "";
    const token = to.split("@")[0].trim();
    if (!token.startsWith("u_")) return; // not one of our addresses
    if (message.rawSize && message.rawSize > MAX_BYTES) return;

    const raw = await new Response(message.raw).text();
    if (raw.length > MAX_BYTES * 2) return;
    const parsed = parseEmail(raw);

    const text = parsed.text || htmlToText(parsed.html);
    const messageId = parsed.messageId || message.headers.get("message-id") || `${token}-${Date.now()}`;
    const auth = parseAuth(message.headers.get("authentication-results"));

    const payload = {
      token,
      messageId,
      from: message.from || "",
      subject: parsed.subject || message.headers.get("subject") || "",
      text: (text || "").slice(0, 100000),
      html: (parsed.html || "").slice(0, 200000),
      auth,
      receivedAt: new Date().toISOString(),
    };

    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = await hmacHex(env.INBOUND_HMAC_SECRET, `${ts}\n${token}\n${messageId}`);

    await fetch(env.INBOUND_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Timestamp": ts, "X-Signature": signature },
      body: JSON.stringify(payload),
    });
  },
};
