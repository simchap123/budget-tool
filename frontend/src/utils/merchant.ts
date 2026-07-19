// Extract a stable "merchant key" from a noisy bank description so the same
// merchant groups together across transactions (e.g. all "OPTIMUM ..." rows).
const NOISE = new Set([
  'POS', 'DEBIT', 'CREDIT', 'PAYMENT', 'PMT', 'PURCHASE', 'ONLINE', 'CARD',
  'ZELLE', 'ACH', 'WITHDRAWAL', 'DEPOSIT', 'TRANSFER', 'RECURRING', 'AUTOPAY',
  'PPD', 'INDN', 'REF', 'WEB', 'LLC', 'INC', 'BILL', 'ORIG', 'NAME', 'ENTRY',
  'DESCR', 'SEC', 'CO', 'ID', 'THE', 'AND', 'FROM',
])

export function merchantKey(description: string): string {
  const tokens = String(description)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !NOISE.has(w) && !/^\d+$/.test(w))
    .sort((a, b) => b.length - a.length)
  return tokens[0] || 'OTHER'
}
