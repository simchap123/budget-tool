/// <reference path="./pb_data/types.d.ts" />
// Shared constants + helpers for email_inbound.pb.js. PocketBase runs each
// route/cron handler in its own JSVM scope, so file-level definitions in the
// hook aren't visible inside the handlers — anything they need must come through
// require() (like plaid_lib / ai_lib). These reference PB globals ($os,
// $security) only at call time, inside the handler VM where they exist.

var EMAIL_DOMAIN_DEFAULT = "transactions.grotketech.com";

function emailDomain() {
  return $os.getenv("INBOUND_EMAIL_DOMAIN") || EMAIL_DOMAIN_DEFAULT;
}

function newToken() {
  return "u_" + $security.randomStringWithAlphabet(16, "abcdefghijklmnopqrstuvwxyz0123456789");
}

module.exports = {
  SIG_WINDOW: 300, // seconds a signed webbook request stays valid (replay guard)
  emailDomain: emailDomain,
  newToken: newToken,
};
