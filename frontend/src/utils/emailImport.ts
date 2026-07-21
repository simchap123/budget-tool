// Helpers for the email-import feature (Settings panel + Needs-review surface).
// Pure functions so the address formatting and review filtering can be tested
// without a running backend.

export interface InboxInfo {
  token: string
  address: string
  enabled: boolean
}

export const INBOX_DOMAIN = 'transactions.grotketech.com'

// Build the private address from a token. Returns '' for a missing/blank token
// so the UI never renders a half-formed `@transactions…` address.
export function formatInboxAddress(token: string, domain: string = INBOX_DOMAIN): string {
  const t = (token || '').trim()
  return t ? `${t}@${domain}` : ''
}

// A transaction the user still needs to confirm (came from email, not yet approved).
export function isReviewTransaction(t: { needsReview?: boolean | null }): boolean {
  return t.needsReview === true
}

// Count of transactions awaiting review.
export function reviewCount(txns: Array<{ needsReview?: boolean | null }>): number {
  return txns.reduce((n, t) => (isReviewTransaction(t) ? n + 1 : n), 0)
}
