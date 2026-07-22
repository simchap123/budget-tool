/// <reference path="./pb_data/types.d.ts" />
// Self-contained TOTP (RFC 6238) for PocketBase v0.20.4, which has no built-in
// MFA. Pure JS SHA-1 + HMAC-SHA1 + base32 so it's compatible with standard
// authenticator apps (Google Authenticator, Authy, 1Password) at their SHA1
// default. Verified against the RFC 6238 SHA1 test vectors (see totp_lib.test).
//
// require()'d INSIDE handlers (PocketBase runs each handler in its own VM).

// ---- SHA-1 (operates on and returns arrays of bytes) ----
function sha1(bytes) {
  function rotl(n, s) { return ((n << s) | (n >>> (32 - s))) >>> 0; }
  var ml = bytes.length * 8;
  var msg = bytes.slice();
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  // 64-bit length, big-endian (high word is 0 for our small inputs)
  var hi = Math.floor(ml / 0x100000000);
  var lo = ml >>> 0;
  msg.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
  msg.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

  var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  for (var i = 0; i < msg.length; i += 64) {
    var w = new Array(80);
    for (var j = 0; j < 16; j++) {
      w[j] = ((msg[i + j * 4] << 24) | (msg[i + j * 4 + 1] << 16) | (msg[i + j * 4 + 2] << 8) | (msg[i + j * 4 + 3])) >>> 0;
    }
    for (j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    var a = h0, b = h1, c = h2, d = h3, e = h4;
    for (j = 0; j < 80; j++) {
      var f, k;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      var t = (rotl(a, 5) + f + e + k + w[j]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  var out = [];
  [h0, h1, h2, h3, h4].forEach(function (h) { out.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff); });
  return out;
}

function hmacSha1(keyBytes, msgBytes) {
  var block = 64;
  var key = keyBytes.slice();
  if (key.length > block) key = sha1(key);
  while (key.length < block) key.push(0);
  var oKey = [], iKey = [];
  for (var i = 0; i < block; i++) { oKey.push(key[i] ^ 0x5c); iKey.push(key[i] ^ 0x36); }
  return sha1(oKey.concat(sha1(iKey.concat(msgBytes))));
}

// RFC 4648 base32 decode (ignores padding/spacing, case-insensitive) -> bytes
function base32Decode(s) {
  var alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  s = String(s).toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  var bits = 0, value = 0, out = [];
  for (var i = 0; i < s.length; i++) {
    var idx = alph.indexOf(s[i]);
    if (idx < 0) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return out;
}

function hotp(secretBytes, counter) {
  // 8-byte big-endian counter
  var buf = [0, 0, 0, 0, 0, 0, 0, 0];
  var c = counter;
  for (var i = 7; i >= 0; i--) { buf[i] = c & 0xff; c = Math.floor(c / 256); }
  var hash = hmacSha1(secretBytes, buf);
  var off = hash[19] & 0x0f;
  var bin = ((hash[off] & 0x7f) << 24) | ((hash[off + 1] & 0xff) << 16) | ((hash[off + 2] & 0xff) << 8) | (hash[off + 3] & 0xff);
  var otp = (bin % 1000000).toString();
  while (otp.length < 6) otp = "0" + otp;
  return otp;
}

// Verify a 6-digit code against the secret, allowing ±`window` steps of drift.
function verifyTotp(secretBase32, code, nowSeconds, window) {
  code = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  var secret = base32Decode(secretBase32);
  if (!secret.length) return false;
  var w = window == null ? 1 : window;
  var step = Math.floor((nowSeconds == null ? Date.now() / 1000 : nowSeconds) / 30);
  for (var d = -w; d <= w; d++) {
    if (hotp(secret, step + d) === code) return true;
  }
  return false;
}

function otpauthURI(label, secretBase32, issuer) {
  var l = encodeURIComponent(issuer) + ":" + encodeURIComponent(label);
  return "otpauth://totp/" + l + "?secret=" + secretBase32 +
    "&issuer=" + encodeURIComponent(issuer) + "&algorithm=SHA1&digits=6&period=30";
}

module.exports = {
  sha1: sha1, hmacSha1: hmacSha1, base32Decode: base32Decode,
  hotp: hotp, verifyTotp: verifyTotp, otpauthURI: otpauthURI,
};
