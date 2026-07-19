import { describe, it, expect } from 'vitest'
// Guards the real backend tokenizer that powers history-based category
// suggestions (imported directly — no duplicated logic to drift).
import { merchantTokens } from '../../../backend/pb_hooks/ai_lib.js'

describe('merchantTokens', () => {
  it('extracts the merchant and drops generic banking noise words', () => {
    expect(merchantTokens('INSTACART DEBIT CARD PURCHASE')).toEqual(['INSTACART'])
  })

  it('strips punctuation and drops short tokens and pure numbers', () => {
    // "SQ" is too short, "123" is a pure number → only STARBUCKS survives.
    expect(merchantTokens('SQ *STARBUCKS #123')).toEqual(['STARBUCKS'])
  })

  it('returns tokens strongest (longest) first', () => {
    expect(merchantTokens('AMAZON.COM*AB12')).toEqual(['AMAZON', 'AB12'])
  })

  it('returns nothing when the description is all noise/short tokens', () => {
    expect(merchantTokens('ACH PAYMENT ZELLE')).toEqual([])
  })

  it('is case-insensitive (equal-length tokens keep source order via stable sort)', () => {
    expect(merchantTokens('Whole Foods Market')).toEqual(['MARKET', 'WHOLE', 'FOODS'])
  })

  it('handles empty / non-string input safely', () => {
    expect(merchantTokens('')).toEqual([])
  })
})
