import { describe, it, expect } from 'vitest'
import { formatInboxAddress, isReviewTransaction, reviewCount, INBOX_DOMAIN } from './emailImport'

describe('formatInboxAddress', () => {
  it('builds an address from a token', () => {
    expect(formatInboxAddress('u_abc123')).toBe(`u_abc123@${INBOX_DOMAIN}`)
  })
  it('honors a custom domain', () => {
    expect(formatInboxAddress('u_x', 'inbox.example.com')).toBe('u_x@inbox.example.com')
  })
  it('returns empty for a blank/whitespace token', () => {
    expect(formatInboxAddress('')).toBe('')
    expect(formatInboxAddress('   ')).toBe('')
  })
})

describe('isReviewTransaction / reviewCount', () => {
  it('flags only needsReview === true', () => {
    expect(isReviewTransaction({ needsReview: true })).toBe(true)
    expect(isReviewTransaction({ needsReview: false })).toBe(false)
    expect(isReviewTransaction({})).toBe(false)
    expect(isReviewTransaction({ needsReview: null })).toBe(false)
  })
  it('counts pending-review transactions', () => {
    expect(reviewCount([{ needsReview: true }, { needsReview: false }, {}, { needsReview: true }])).toBe(2)
    expect(reviewCount([])).toBe(0)
  })
})
