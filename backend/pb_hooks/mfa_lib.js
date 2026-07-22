/// <reference path="./pb_data/types.d.ts" />
// Helpers for mfa.pb.js. Kept in a plain lib (not the .pb.js) so handlers can
// require() it without re-running routerAdd. References PB globals only at call
// time, inside the handler VM.

var ISSUER = "Budget Tool";

// The user's 2FA row, or null if none. `findFirstRecordByFilter` throws when not
// found — that simply means "no 2FA".
function mfaGet(dao, userId) {
  try { return dao.findFirstRecordByFilter("user_mfa", "userId = {:u}", { u: userId }); }
  catch (e) { return null; }
}

// 32-byte AES key for encrypting the TOTP secret at rest.
function encKey() {
  var k = $os.getenv("MFA_ENC_KEY");
  if (!k || k.length < 32) throw new BadRequestError("2FA is not configured on the server");
  return k.slice(0, 32);
}

module.exports = { ISSUER: ISSUER, mfaGet: mfaGet, encKey: encKey };
