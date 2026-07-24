/// <reference path="./pb_data/types.d.ts" />
// Turn a transaction-alert email into a structured transaction.
//
//   extractTransaction({ from, subject, text, html }) ->
//     { found, amount, description, merchant, type, date, accountLast4, confidence, via }
//
// Strategy (per the design's phasing):
//   1) Deterministic rule parsers keyed by sender — currently Chase (the live
//      account). A hit is free, instant, and high-confidence (~0.98).
//   2) Gemini 2.0 Flash fallback for every other sender / when a rule can't
//      confidently pull an amount. Same $os.getenv + $http.send pattern as ai.pb.js.
//
// Everything that doesn't touch the network is a small pure helper so the parsing
// can be reasoned about in isolation.

// Collapse an HTML body to readable text: drop scripts/styles, turn tags into
// spaces, decode the few entities that matter for money strings.
function htmlToText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#36;|&dollar;/gi, "$")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// First "$1,234.56"-style money amount in a string -> Number, or null.
function firstAmount(s) {
  if (!s) return null;
  var m = String(s).match(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/);
  if (!m) return null;
  var n = parseFloat(m[1].replace(/,/g, ""));
  return isFinite(n) && n > 0 ? n : null;
}

// A bank email is income if it clearly describes money coming in.
function guessType(blob) {
  var s = " " + String(blob || "").toLowerCase() + " ";
  if (/\b(deposit|direct deposit|payment received|you received|refund|credited|credit to)\b/.test(s)) return "income";
  return "expense";
}

// "Jul 21, 2026" / "07/21/2026" / "2026-07-21" -> YYYY-MM-DD, or null.
function findDate(blob) {
  var s = String(blob || "");
  var iso = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  var mdy = s.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (mdy) return mdy[3] + "-" + ("0" + mdy[1]).slice(-2) + "-" + ("0" + mdy[2]).slice(-2);
  var MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  var named = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (named) {
    var mo = MONTHS[named[1].slice(0, 3).toLowerCase()];
    if (mo) return named[3] + "-" + mo + "-" + ("0" + named[2]).slice(-2);
  }
  return null;
}

function last4(blob) {
  var m = String(blob || "").match(/(?:ending in|account ending|\(\.\.\.|xxxx|\*{2,})\s*\(?\.?\.?\.?\s*(\d{4})\b/i);
  return m ? m[1] : "";
}

// ---- Rule parsers (Phase 2 seed) -------------------------------------------

function isChase(from) {
  return /(chase|jpmorgan)\.com/i.test(String(from || ""));
}

// Chase card/account alerts: "You made a $53.27 transaction with STARBUCKS",
// or a body table with Amount / Merchant / Date rows. Best-effort: return null
// (→ Gemini) whenever we can't confidently pull an amount + merchant.
function parseChase(email) {
  var blob = (email.subject || "") + "\n" + (email.text || "");
  var amount = firstAmount(email.subject) || firstAmount(blob);
  if (!amount) return null;

  var merchant = "";
  var withM = blob.match(/\b(?:transaction (?:with|at)|purchase (?:with|at)|with|at)\s+([A-Z0-9][A-Za-z0-9 &'.\-*]{2,40})/);
  if (withM) merchant = withM[1].trim().replace(/\s+(on|for|was|has)\b.*/i, "").trim();
  var merchLine = blob.match(/(?:Merchant|Where|Description)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9 &'.\-*]{2,40})/i);
  if (!merchant && merchLine) merchant = merchLine[1].trim();
  if (!merchant) return null; // let Gemini try rather than store a blank payee

  return {
    found: true,
    amount: amount,
    merchant: merchant,
    description: merchant,
    type: guessType(blob),
    date: findDate(blob) || "",
    accountLast4: last4(blob),
    confidence: 0.98,
    via: "rule:chase",
  };
}

var RULE_PARSERS = [{ match: isChase, parse: parseChase }];

// ---- Gemini fallback --------------------------------------------------------

function parseGeminiJson(text) {
  var cleaned = String(text || "").replace(/```json|```/g, "").trim();
  var obj;
  try { obj = JSON.parse(cleaned); } catch (e) { return null; }
  if (!obj || obj.found === false) return { found: false };
  var amount = parseFloat(obj.amount);
  if (!isFinite(amount) || amount <= 0) return { found: false };
  var conf = parseFloat(obj.confidence);
  return {
    found: true,
    amount: amount,
    merchant: String(obj.merchant || obj.description || "").slice(0, 120),
    description: String(obj.merchant || obj.description || "").slice(0, 200),
    type: obj.type === "income" ? "income" : "expense",
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(obj.date)) ? obj.date : "",
    accountLast4: String(obj.accountLast4 || "").replace(/\D/g, "").slice(-4),
    confidence: isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0.7,
    via: "ai",
  };
}

function extractWithGemini(email) {
  var key = $os.getenv("GEMINI_API_KEY");
  if (!key) return { found: false, via: "no-key" };
  var body = email.text && email.text.length > 40 ? email.text : htmlToText(email.html);
  var prompt =
    "You extract ONE financial transaction from a bank or credit-card alert email. " +
    "If the email is not a transaction alert (marketing, statement-ready, login alert, etc.), " +
    'return {"found": false}. Otherwise return STRICT JSON only: ' +
    '{"found": true, "amount": number (positive), "merchant": string, "description": string, ' +
    '"type": "expense" | "income", "date": "YYYY-MM-DD" or "", "accountLast4": string or "", ' +
    '"confidence": number between 0 and 1}. Never invent an amount that is not present. ' +
    'From: "' + String(email.from || "") + '". Subject: "' + String(email.subject || "") + '". Body: ' +
    JSON.stringify(String(body || "").slice(0, 4000));
  try {
    var res = $http.send({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key,
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } }),
      headers: { "Content-Type": "application/json" },
      timeout: 30,
    });
    if (res.statusCode === 200 && res.json && res.json.candidates) {
      var text = res.json.candidates[0].content.parts[0].text || "";
      var parsed = parseGeminiJson(text);
      if (parsed) return parsed;
    }
    return { found: false, via: "ai-empty" };
  } catch (e) {
    return { found: false, via: "ai-error", error: String((e && e.message) || e) };
  }
}

// Decode RFC 2047 "=?UTF-8?Q?...?=" / "?B?..." encoded-words (common in subjects).
function decodeMimeWords(s) {
  return String(s || "").replace(/=\?[^?]+\?([QqBb])\?([^?]*)\?=/g, function (_, enc, txt) {
    try {
      if (enc.toUpperCase() === "B") return decodeURIComponent(escape(atob(txt)));
      return txt.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
    } catch (e) { return txt; }
  });
}

// Last-resort parser (used when no rule matches and Gemini is unavailable/failed):
// pull the first money amount out of any bank-alert-looking email. Low confidence
// so it always lands in the review queue for the user to confirm.
function genericExtract(email) {
  var subject = decodeMimeWords(email.subject || "");
  var body = email.text && email.text.length > 20 ? email.text : htmlToText(email.html || "");
  var blob = subject + "\n" + body;
  var amount = firstAmount(subject) || firstAmount(body);
  if (!amount) return { found: false, via: "generic-none" };
  // Only act on transaction-ish mail so newsletters with a "$" don't slip through.
  if (!/\b(transaction|purchase|debit|credit|charged?|payment|paid|spent|withdrew|withdrawal|deposit|balance|card|merchant|amount)\b/i.test(blob)) {
    return { found: false, via: "generic-nokw" };
  }
  var merchant = "";
  var m = blob.match(/\b(?:at|to|with|from)\s+([A-Z0-9][A-Za-z0-9 &'.\-*]{2,40})/);
  if (m) merchant = m[1].trim().replace(/\s+(on|for|was|has|of|using|ending)\b.*/i, "").trim();
  var desc = merchant || subject.replace(/^\s*(fwd|re):\s*/i, "").slice(0, 80).trim() || "Email transaction";
  return {
    found: true,
    amount: amount,
    merchant: merchant,
    description: desc,
    type: guessType(blob),
    date: findDate(blob) || "",
    accountLast4: last4(blob),
    confidence: 0.4, // always routes to Needs review
    via: "generic",
  };
}

function extractTransaction(email) {
  email = email || {};
  for (var i = 0; i < RULE_PARSERS.length; i++) {
    if (RULE_PARSERS[i].match(email.from)) {
      var r = RULE_PARSERS[i].parse(email);
      if (r && r.found) return r;
    }
  }
  var g = extractWithGemini(email);
  if (g && g.found) return g;
  // Gemini unavailable (e.g. no quota) or found nothing -> generic fallback.
  return genericExtract(email);
}

module.exports = {
  extractTransaction: extractTransaction,
  parseChase: parseChase,
  parseGeminiJson: parseGeminiJson,
  htmlToText: htmlToText,
  firstAmount: firstAmount,
  guessType: guessType,
  findDate: findDate,
};
