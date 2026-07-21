import { describe, it, expect } from 'vitest'
import { txnSignature, dedupeAgainstExisting, normalizeDescription } from './csvImport'

const tx = (date: string, amount: number, description: string, type = 'expense') =>
  ({ date, amount, description, type, category: '', note: '', userId: 'u' })

describe('normalizeDescription', () => {
  it('collapses case, whitespace and quote variants of one description', () => {
    const canonical = 'ZELLE PAYMENT TO X'
    expect(normalizeDescription('Zelle payment to X')).toBe(canonical)
    expect(normalizeDescription('  ZELLE PAYMENT TO X  ')).toBe(canonical)
    expect(normalizeDescription('ZELLE   PAYMENT  TO X')).toBe(canonical)
    expect(normalizeDescription('"ZELLE PAYMENT TO X"')).toBe(canonical)
    expect(normalizeDescription('"Zelle   payment to X"')).toBe(canonical)
  })
  it('keeps digits and meaningful punctuation intact', () => {
    expect(normalizeDescription('Amazon.com*A1B2 #500')).toBe('AMAZON.COM*A1B2 #500')
  })
  it('tolerates null/undefined without throwing', () => {
    expect(normalizeDescription(undefined as unknown as string)).toBe('')
    expect(normalizeDescription(null as unknown as string)).toBe('')
  })
})

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
  it('produces the same signature for case/whitespace/quote variants of one txn', () => {
    const base = txnSignature(tx('2026-07-16', 12.5, 'ZELLE PAYMENT TO X'))
    expect(txnSignature(tx('2026-07-16', 12.5, 'Zelle payment to X'))).toBe(base)
    expect(txnSignature(tx('2026-07-16', 12.5, 'ZELLE   PAYMENT TO X'))).toBe(base)
    expect(txnSignature(tx('2026-07-16', 12.5, '"ZELLE PAYMENT TO X"'))).toBe(base)
  })
  it('still distinguishes genuinely different descriptions', () => {
    expect(txnSignature(tx('2026-07-16', 12.5, 'ZELLE PAYMENT TO X'))).not.toBe(
      txnSignature(tx('2026-07-16', 12.5, 'ZELLE PAYMENT TO Y'))
    )
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

  it('dedupes a re-import whose descriptions differ only by CASE', () => {
    const existing = [tx('2026-07-16', 25, 'ZELLE PAYMENT TO X')]
    const candidates = [tx('2026-07-16', 25, 'Zelle payment to X')]
    const { fresh, duplicates } = dedupeAgainstExisting(candidates, existing)
    expect(duplicates).toBe(1)
    expect(fresh).toHaveLength(0)
  })

  it('dedupes a re-import whose descriptions are wrapped in literal QUOTES', () => {
    const existing = [tx('2026-07-16', 25, 'ZELLE PAYMENT TO X')]
    const candidates = [tx('2026-07-16', 25, '"ZELLE PAYMENT TO X"')]
    const { fresh, duplicates } = dedupeAgainstExisting(candidates, existing)
    expect(duplicates).toBe(1)
    expect(fresh).toHaveLength(0)
  })

  it('dedupes a re-import with extra INTERNAL whitespace', () => {
    const existing = [tx('2026-07-16', 25, 'ZELLE PAYMENT TO X')]
    const candidates = [tx('2026-07-16', 25, 'ZELLE    PAYMENT   TO X')]
    const { fresh, duplicates } = dedupeAgainstExisting(candidates, existing)
    expect(duplicates).toBe(1)
    expect(fresh).toHaveLength(0)
  })

  it('does NOT dedupe genuinely different descriptions on the same day/amount', () => {
    const existing = [tx('2026-07-16', 25, 'ZELLE PAYMENT TO X')]
    const candidates = [tx('2026-07-16', 25, 'ZELLE PAYMENT TO Y')]
    const { fresh, duplicates } = dedupeAgainstExisting(candidates, existing)
    expect(duplicates).toBe(0)
    expect(fresh.map((f) => f.description)).toEqual(['ZELLE PAYMENT TO Y'])
  })

  it('still imports a real same-day repeat purchase despite normalization', () => {
    // Two identical coffees the same day; only one already stored. Casing differs
    // between the stored copy and the sheet, but the second is still a new purchase.
    const existing = [tx('2026-07-16', 3.5, 'Coffee')]
    const candidates = [tx('2026-07-16', 3.5, 'COFFEE'), tx('2026-07-16', 3.5, 'coffee')]
    const { fresh, duplicates } = dedupeAgainstExisting(candidates, existing)
    expect(duplicates).toBe(1)
    expect(fresh).toHaveLength(1)
  })
})
