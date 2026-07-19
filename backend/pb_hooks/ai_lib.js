// Shared helpers for the AI category-suggestion hook. require()'d inside the
// handler because PocketBase JSVM handlers don't share the file's top-level scope.
// The pure functions here are also unit-tested from the frontend suite via
// ai_lib.d.ts (no PB globals are used at module load).

var NOISE = {
  POS: 1, DEBIT: 1, CREDIT: 1, PAYMENT: 1, PURCHASE: 1, ONLINE: 1, CARD: 1,
  ZELLE: 1, ACH: 1, WITHDRAWAL: 1, DEPOSIT: 1, TRANSFER: 1, RECURRING: 1,
  AUTOPAY: 1, PPD: 1, INDN: 1, REF: 1, WEB: 1, LLC: 1, INC: 1, PMT: 1, BILL: 1,
};

// Candidate merchant tokens from a transaction description, strongest (longest)
// first: uppercase, strip punctuation, then drop short words (<4), pure numbers,
// and generic banking noise words (POS, DEBIT, ACH, …).
function merchantTokens(desc) {
  return String(desc)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(function (w) { return w.length >= 4 && !NOISE[w] && !/^\d+$/.test(w); })
    .sort(function (a, b) { return b.length - a.length; });
}

module.exports = { merchantTokens, NOISE };
