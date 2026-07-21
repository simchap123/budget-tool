/// <reference path="./pb_data/types.d.ts" />
// Email → transaction capture. See docs/superpowers/specs/2026-07-21-email-transaction-import-design.md
//
//   Cloudflare Email Worker  --HMAC-->  POST /api/inbound/transaction-email
//        (stores the mail in `inbound_emails` as pending, returns 200 fast)
//   cron "email-extract"     --1 min-->  parse pending -> create transaction (needsReview)
//   RPCs                     --auth-->   the Settings "Email import" panel
//
// The address alone never authorizes a transaction: every webhook call is HMAC-
// signed by the Worker over `timestamp\ntoken\nmessageId`, the timestamp must be
// fresh (replay guard), and the token must map to an enabled inbox.

// ---- Webhook ---------------------------------------------------------------

routerAdd("POST", "/api/inbound/transaction-email", (c) => {
 try {
  const { SIG_WINDOW } = require(`${__hooks}/email_inbound_lib.js`);
  const secret = $os.getenv("INBOUND_HMAC_SECRET");
  if (!secret) return c.json(500, { error: "not configured" });

  const info = $apis.requestInfo(c);
  const data = info.data || {};
  const token = String(data.token || "");
  const messageId = String(data.messageId || "");
  const ts = String((info.headers && (info.headers.x_timestamp || info.headers["x-timestamp"])) || "");
  const sig = String((info.headers && (info.headers.x_signature || info.headers["x-signature"])) || "");

  // 1) Verify signature + freshness before touching the database.
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  if (!isFinite(tsNum) || Math.abs(now - tsNum) > SIG_WINDOW) {
    return c.json(401, { error: "stale" });
  }
  const expected = $security.hs256(ts + "\n" + token + "\n" + messageId, secret);
  if (!sig || !$security.equal(expected, sig)) {
    return c.json(401, { error: "bad signature" });
  }
  if (!token || !messageId) return c.json(400, { error: "missing fields" });

  const dao = $app.dao();

  // 2) Resolve the token. Unknown/disabled tokens are silently accepted (202) so
  //    the response can't be used to probe which addresses exist.
  let inbox;
  try {
    inbox = dao.findFirstRecordByFilter("email_inboxes", "token = {:t}", { t: token });
  } catch (e) {
    return c.json(202, { ok: true });
  }
  if (!inbox || inbox.get("enabled") === false) return c.json(202, { ok: true });

  // 3) Dedup on Message-ID — a replayed email never creates a second transaction.
  try {
    dao.findFirstRecordByFilter("inbound_emails", "messageId = {:m}", { m: messageId });
    return c.json(200, { queued: false, duplicate: true });
  } catch (e) { /* not seen before — good */ }

  // 4) Store as pending; the cron does the extraction.
  try {
    const col = dao.findCollectionByNameOrId("inbound_emails");
    const rec = new Record(col, {
      userId: inbox.get("userId"),
      messageId: messageId,
      fromAddr: String(data.from || ""),
      subject: String(data.subject || ""),
      raw: JSON.stringify({ text: String(data.text || ""), html: String(data.html || "") }),
      auth: data.auth || {},
      status: "pending",
    });
    dao.saveRecord(rec);
    return c.json(200, { queued: true });
  } catch (err) {
    return c.json(500, { error: String((err && err.message) || err) });
  }
 } catch (fatal) {
  console.log("[inbound] webhook error: " + String((fatal && fatal.message) || fatal));
  return c.json(500, { error: "internal" });
 }
});

// ---- Cron: process the pending queue ---------------------------------------

cronAdd("email-extract", "* * * * *", () => {
  const dao = $app.dao();
  let pending;
  try {
    pending = dao.findRecordsByFilter("inbound_emails", "status = 'pending'", "created", 20, 0);
  } catch (e) { return; }
  if (!pending || !pending.length) return;

  const { extractTransaction } = require(`${__hooks}/email_extract_lib.js`);
  let categorize;
  try { categorize = require(`${__hooks}/categorize_lib.js`).categorize; } catch (e) { categorize = null; }

  pending.forEach((rec) => {
    try {
      const userId = rec.get("userId");
      let payload = {};
      try { payload = JSON.parse(rec.get("raw") || "{}"); } catch (e) { payload = {}; }
      const auth = rec.get("auth") || {};

      const result = extractTransaction({
        from: rec.get("fromAddr"),
        subject: rec.get("subject"),
        text: payload.text || "",
        html: payload.html || "",
      });

      if (!result || !result.found) {
        rec.set("status", "skipped");
        rec.set("raw", "");
        dao.saveRecord(rec);
        return;
      }

      const date = result.date || String(rec.get("created")).slice(0, 10);
      const description = result.description || result.merchant || rec.get("subject") || "Email transaction";
      const type = result.type === "income" ? "income" : "expense";

      // Dedup against existing transactions (same day + amount + description + type).
      let dup = false;
      try {
        dao.findFirstRecordByFilter(
          "transactions",
          "userId = {:u} && date = {:d} && amount = {:a} && description = {:desc} && type = {:t}",
          { u: userId, d: date, a: result.amount, desc: description, t: type }
        );
        dup = true;
      } catch (e) { /* fresh */ }

      if (dup) {
        rec.set("status", "done");
        rec.set("confidence", result.confidence || 0);
        rec.set("raw", "");
        dao.saveRecord(rec);
        return;
      }

      // SPF/DKIM failure on a claimed bank domain -> always route to review.
      const authOk = !auth || (auth.spf !== "fail" && auth.dkim !== "fail");
      const needsReview = (result.confidence || 0) < 0.9 || !authOk;

      const txCol = dao.findCollectionByNameOrId("transactions");
      const tx = new Record(txCol, {
        userId: userId,
        date: date,
        amount: result.amount,
        description: description,
        type: type,
        category: categorize ? (categorize(description) || "") : "",
        source: "email",
        needsReview: needsReview,
      });
      dao.saveRecord(tx);

      rec.set("status", "done");
      rec.set("confidence", result.confidence || 0);
      rec.set("transactionId", tx.id);
      rec.set("raw", ""); // delete the stored body once extracted
      dao.saveRecord(rec);
    } catch (err) {
      try {
        rec.set("status", "error");
        rec.set("error", String((err && err.message) || err).slice(0, 500));
        dao.saveRecord(rec);
      } catch (e2) { /* give up on this row */ }
    }
  });
});

// ---- RPCs for the Settings "Email import" panel ----------------------------

// Get-or-create the caller's private inbox. Returns the full address.
routerAdd("POST", "/api/rpc/email-inbox", (c) => {
  const { emailDomain, newToken } = require(`${__hooks}/email_inbound_lib.js`);
  const info = $apis.requestInfo(c);
  const user = info.authRecord;
  if (!user) return c.json(401, { error: "unauthorized" });
  const dao = $app.dao();
  let inbox;
  try {
    inbox = dao.findFirstRecordByFilter("email_inboxes", "userId = {:u}", { u: user.id });
  } catch (e) {
    const col = dao.findCollectionByNameOrId("email_inboxes");
    inbox = new Record(col, { userId: user.id, token: newToken(), enabled: true });
    dao.saveRecord(inbox);
  }
  const token = inbox.get("token");
  return c.json(200, { token: token, address: token + "@" + emailDomain(), enabled: inbox.get("enabled") !== false });
}, $apis.requireRecordAuth());

// Mint a brand-new token (the old address stops working immediately).
routerAdd("POST", "/api/rpc/email-inbox/rotate", (c) => {
  const { emailDomain, newToken } = require(`${__hooks}/email_inbound_lib.js`);
  const info = $apis.requestInfo(c);
  const user = info.authRecord;
  if (!user) return c.json(401, { error: "unauthorized" });
  const dao = $app.dao();
  let inbox;
  try {
    inbox = dao.findFirstRecordByFilter("email_inboxes", "userId = {:u}", { u: user.id });
  } catch (e) {
    const col = dao.findCollectionByNameOrId("email_inboxes");
    inbox = new Record(col, { userId: user.id, enabled: true });
  }
  inbox.set("token", newToken());
  dao.saveRecord(inbox);
  const token = inbox.get("token");
  return c.json(200, { token: token, address: token + "@" + emailDomain(), enabled: inbox.get("enabled") !== false });
}, $apis.requireRecordAuth());

// Enable/disable capture without losing the address.
routerAdd("POST", "/api/rpc/email-inbox/toggle", (c) => {
  const { emailDomain } = require(`${__hooks}/email_inbound_lib.js`);
  const info = $apis.requestInfo(c);
  const user = info.authRecord;
  if (!user) return c.json(401, { error: "unauthorized" });
  const enabled = !!(info.data && info.data.enabled);
  const dao = $app.dao();
  let inbox;
  try {
    inbox = dao.findFirstRecordByFilter("email_inboxes", "userId = {:u}", { u: user.id });
  } catch (e) {
    return c.json(404, { error: "no inbox" });
  }
  inbox.set("enabled", enabled);
  dao.saveRecord(inbox);
  const token = inbox.get("token");
  return c.json(200, { token: token, address: token + "@" + emailDomain(), enabled: enabled });
}, $apis.requireRecordAuth());
