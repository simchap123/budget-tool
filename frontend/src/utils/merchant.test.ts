import { describe, it, expect } from 'vitest'
import { merchantKey } from './merchant'

describe('merchantKey', () => {
  it('picks the strongest merchant token, dropping noise/numbers', () => {
    expect(merchantKey('OPTIMUM 7811 CABLE BILL PAYMENT')).toBe('OPTIMUM')
  })

  it('strips punctuation and short/numeric tokens', () => {
    expect(merchantKey('SQ *STARBUCKS #445')).toBe('STARBUCKS')
  })

  it('is case-insensitive', () => {
    expect(merchantKey('Netflix.com')).toBe('NETFLIX')
  })

  it('returns OTHER when everything is noise or too short', () => {
    expect(merchantKey('ACH DEBIT ZELLE')).toBe('OTHER')
    expect(merchantKey('')).toBe('OTHER')
  })

  it('groups the same merchant across differing noise', () => {
    expect(merchantKey('OPTIMUM 123 ONLINE PMT')).toBe(merchantKey('POS OPTIMUM CABLE'))
  })
})
