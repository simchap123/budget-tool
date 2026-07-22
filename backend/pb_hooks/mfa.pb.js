/// <reference path="./pb_data/types.d.ts" />
// In-app TOTP two-factor authentication for end users (RFC 6238 via totp_lib.js).
// The secret lives in the `user_mfa` collection (no API access) and is stored
// AES-encrypted with MFA_ENC_KEY; only these hooks can read it.
//
//   GET  /api/mfa/status              -> { enabled }
//   POST /api/mfa/setup               -> { secret, otpauth }   (starts enrollment)
//   POST /api/mfa/enable   { code }   -> { enabled: true }      (confirms + turns on)
//   POST /api/mfa/disable  { code }   -> { enabled: false }
//   login gate: onRecordBeforeAuthWithPasswordRequest requires a valid X-OTP
//               header for any user with 2FA enabled (no token issued otherwise).

// ---- status ----
routerAdd("GET", "/api/mfa/status", (c) => {
  const { mfaGet } = require(`${__hooks}/mfa_lib.js`);
  const info = $apis.requestInfo(c);
  const user = info.authRecord;
  if (!user) return c.json(401, { error: "unauthorized" });
  const rec = mfaGet($app.dao(), user.id);
  return c.json(200, { enabled: !!(rec && rec.get("enabled")) });
}, $apis.requireRecordAuth());

// ---- setup: mint a pending secret, return it for the QR ----
routerAdd("POST", "/api/mfa/setup", (c) => {
  const { mfaGet, encKey, ISSUER } = require(`${__hooks}/mfa_lib.js`);
  const { otpauthURI } = require(`${__hooks}/totp_lib.js`);
  const info = $apis.requestInfo(c);
  const user = info.authRecord;
  if (!user) return c.json(401, { error: "unauthorized" });

  const key = encKey();
  const secret = $security.randomStringWithAlphabet(32, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
  const dao = $app.dao();
  let rec = mfaGet(dao, user.id);
  if (!rec) {
    rec = new Record(dao.findCollectionByNameOrId("user_mfa"), { userId: user.id, enabled: false });
  }
  rec.set("pending", $security.encrypt(secret, key));
  dao.saveRecord(rec);
  return c.json(200, { secret: secret, otpauth: otpauthURI(user.getString("email"), secret, ISSUER) });
}, $apis.requireRecordAuth());

// ---- enable: verify a code against the pending secret, then turn on ----
routerAdd("POST", "/api/mfa/enable", (c) => {
  const { mfaGet, encKey } = require(`${__hooks}/mfa_lib.js`);
  const { verifyTotp } = require(`${__hooks}/totp_lib.js`);
  const info = $apis.requestInfo(c);
  const user = info.authRecord;
  if (!user) return c.json(401, { error: "unauthorized" });
  const code = String((info.data && info.data.code) || "");

  const key = encKey();
  const dao = $app.dao();
  const rec = mfaGet(dao, user.id);
  if (!rec || !rec.get("pending")) return c.json(400, { error: "start setup first" });

  // Step-up: if 2FA is already on, re-enrollment must prove the CURRENT factor
  // (via `current_code`) before we replace it — otherwise a hijacked session
  // could silently swap the victim's authenticator for the attacker's. The UI
  // routes re-enrollment through disable-first, so this only bites direct API abuse.
  if (rec.get("enabled") && rec.get("secret")) {
    const current = String((info.data && info.data.current_code) || "");
    const curSecret = $security.decrypt(rec.get("secret"), key);
    if (!verifyTotp(curSecret, current, null, 1)) return c.json(400, { error: "current code required" });
  }

  const secret = $security.decrypt(rec.get("pending"), key);
  if (!verifyTotp(secret, code, null, 1)) return c.json(400, { error: "invalid code" });

  rec.set("secret", rec.get("pending"));
  rec.set("pending", "");
  rec.set("enabled", true);
  dao.saveRecord(rec);
  return c.json(200, { enabled: true });
}, $apis.requireRecordAuth());

// ---- disable: verify a current code, then turn off ----
routerAdd("POST", "/api/mfa/disable", (c) => {
  const { mfaGet, encKey } = require(`${__hooks}/mfa_lib.js`);
  const { verifyTotp } = require(`${__hooks}/totp_lib.js`);
  const info = $apis.requestInfo(c);
  const user = info.authRecord;
  if (!user) return c.json(401, { error: "unauthorized" });
  const code = String((info.data && info.data.code) || "");

  const key = encKey();
  const dao = $app.dao();
  const rec = mfaGet(dao, user.id);
  if (!rec || !rec.get("enabled")) return c.json(200, { enabled: false });
  const secret = $security.decrypt(rec.get("secret"), key);
  if (!verifyTotp(secret, code, null, 1)) return c.json(400, { error: "invalid code" });

  rec.set("secret", "");
  rec.set("pending", "");
  rec.set("enabled", false);
  dao.saveRecord(rec);
  return c.json(200, { enabled: false });
}, $apis.requireRecordAuth());

// ---- login gate ----
// Blocks password auth for MFA users unless a valid X-OTP header is supplied.
// Fails CLOSED: once we know a user has 2FA enabled, any problem verifying the
// code blocks the login rather than allowing a bypass. Non-2FA users are
// unaffected (we return before any crypto runs).
onRecordBeforeAuthWithPasswordRequest((e) => {
  if (!e.record) return;
  const { mfaGet, encKey } = require(`${__hooks}/mfa_lib.js`);
  const { verifyTotp } = require(`${__hooks}/totp_lib.js`);

  let rec;
  try { rec = mfaGet($app.dao(), e.record.id); } catch (x) { rec = null; }
  if (!rec || !rec.get("enabled")) return; // no 2FA -> normal login

  const otp = String(e.httpContext.request().header.get("X-OTP") || "");
  if (!otp) throw new BadRequestError("mfa_required");

  let secret;
  try { secret = $security.decrypt(rec.get("secret"), encKey()); }
  catch (x) { console.log("[mfa] verify error: " + String((x && x.message) || x)); throw new BadRequestError("mfa_required"); }

  if (!verifyTotp(secret, otp, null, 1)) throw new BadRequestError("mfa_invalid");
  // valid -> allow the auth to proceed and issue a token
}, "users");
