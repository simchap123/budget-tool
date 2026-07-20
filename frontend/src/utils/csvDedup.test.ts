import { describe, it, expect } from 'vitest'
import { txnSignature, dedupeAgainstExisting } from './csvImport'

const tx = (date: string, amount: number, description: string, type = 'expense') =>
  ({ date, amount, description, type, category: '', note: '', userId: 'u' })

describe('txnSignature', () => {
  it('slices the stored full timestamp to the day so it matches an import date', () => {
    expect(txnSignature(tx('2026-07-16 00:00:00.000Z', 12.5, 'NEWDAY'))).toBe(
      txnSignature(tx('2026-07-16', 12.5, 'NEWDAY'))
    )
  })
  it('distinguishes amount, direction and description', () => {
    expect(txnSignature(tx('2026-07-16', 12.5, 'A'))).not.toBe(txnSignature(tx('2026-07-16', 12.51, 'A')))
    expect(txnSignature(tx('2026-07-16', 12.5, 'A', 'expense'))).not.toBe(txnSignature(tx('2026-07-16', 12.5, 'A', 'income')))
  })
})

describe('dedupeAgainstExisting', () => {
  it('skips rows already in the account, keeps genuinely new ones', () => {
    const existing = [tx('2026-07-16', 12.5, 'NEWDAY'), tx('2026-07-15', 40, 'AMAZON')]
    const candidates = [tx('2026-07-16', 12.5, 'NEWDAY'), tx('2026-07-17', 9, 'DUNKIN')]
    const { fresh, duplicates } = dedupeAgainstExisting(candidates, existing)
    expect(duplicates).toBe(1)
    expect(fresh.map((f) => f.description)).toEqual(['DUNKIN'])
  })

  it('keeps a real repeat purchase when only one copy is already stored (count-aware)', () => {
    const existing = [tx('2026-07-16', 3.5, 'COFFEE')] // one already in DB
    const candidates = [tx('2026-07-16', 3.5, 'COFFEE'), tx('2026-07-16', 3.5, 'COFFEE')] // sheet has two
    const { fresh, duplicates } = dedupeAgainstExisting(candidates, existing)
    expect(duplicates).toBe(1) // first absorbs the stored copy
    expect(fresh).toHaveLength(1) // second is a genuine new purchase
  })

  it('re-uploading the exact same sheet after it was imported adds nothing', () => {
    const sheet = [tx('2026-07-16', 12.5, 'NEWDAY'), tx('2026-07-15', 40, 'AMAZON')]
    const { fresh, duplicates } = dedupeAgainstExisting(sheet, sheet)
    expect(duplicates).toBe(2)
    expect(fresh).toHaveLength(0)
  })
})
