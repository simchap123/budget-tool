import { describe, it, expect } from 'vitest'
import { csvRowToTransaction } from './csvImport'

const H = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Note']

describe('csvRowToTransaction', () => {
  it('maps a basic expense row (case-insensitive headers)', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', 'Coffee', '4.50', '', '', ''], 'u1')).toEqual({
      amount: 4.5,
      description: 'Coffee',
      type: 'expense',
      category: 'Uncategorized',
      note: '',
      userId: 'u1',
      date: '2026-07-01 00:00:00.000Z',
    })
  })

  it('treats a negative amount as its absolute value', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', 'Refund', '-30', '', '', ''], 'u')!.amount).toBe(30)
  })

  it('maps type income (or "in") to income, everything else to expense', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', 'Paycheck', '1000', 'income', '', ''], 'u')!.type).toBe('income')
    expect(csvRowToTransaction(H, ['2026-07-01', 'Paycheck', '1000', 'IN', '', ''], 'u')!.type).toBe('income')
    expect(csvRowToTransaction(H, ['2026-07-01', 'Shop', '20', 'debit', '', ''], 'u')!.type).toBe('expense')
  })

  it('falls back to the memo column for the description', () => {
    const h = ['date', 'memo', 'amount']
    expect(csvRowToTransaction(h, ['2026-07-01', 'ACH TRANSFER', '12'], 'u')!.description).toBe('ACH TRANSFER')
  })

  it('skips a row with no description', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', '', '5', '', '', ''], 'u')).toBeNull()
  })

  it('skips a zero-amount row', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', 'Nothing', '0', '', '', ''], 'u')).toBeNull()
  })

  it('skips a non-numeric amount instead of posting a NaN transaction', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', 'Junk', 'not-a-number', '', '', ''], 'u')).toBeNull()
  })

  it('normalizes a US-format date to a filterable value', () => {
    expect(csvRowToTransaction(H, ['07/17/2026', 'Store', '9', '', '', ''], 'u')!.date).toBe('2026-07-17 00:00:00.000Z')
  })

  it('strips wrapping double-quote characters from the description', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', '"ZELLE PAYMENT TO X"', '25', '', '', ''], 'u')!.description).toBe('ZELLE PAYMENT TO X')
  })

  it('leaves inner quotes and other punctuation in the description intact', () => {
    expect(csvRowToTransaction(H, ['2026-07-01', 'AMAZON.COM*A1B2 #500', '25', '', '', ''], 'u')!.description).toBe('AMAZON.COM*A1B2 #500')
  })
})

import { hasSignedAmounts, amountColumnIndex } from './csvImport'

describe('csvRowToTransaction — real Chase formats', () => {
  // Chase credit-card export
  const CC = ['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount', 'Memo']

  it('reads Chase "Transaction Date" and a signed purchase (negative = expense)', () => {
    const t = csvRowToTransaction(CC, ['07/15/2026', '07/16/2026', 'AMAZON', 'Shopping', 'Sale', '-52.30', ''], 'u', true)!
    expect(t).toMatchObject({ type: 'expense', amount: 52.3, category: 'Shopping', date: '2026-07-15 00:00:00.000Z', description: 'AMAZON' })
  })

  it('treats a positive amount in a signed file as income (e.g. a card payment)', () => {
    const t = csvRowToTransaction(CC, ['07/20/2026', '07/20/2026', 'Payment Thank You', '', 'Payment', '500.00', ''], 'u', true)!
    expect(t).toMatchObject({ type: 'income', amount: 500 })
  })

  it('strips $ and commas from amounts', () => {
    const t = csvRowToTransaction(CC, ['07/01/2026', '', 'Rent', '', 'Sale', '-$1,250.00', ''], 'u', true)!
    expect(t.amount).toBe(1250)
    expect(t.type).toBe('expense')
  })

  it('handles Chase checking via Posting Date + sign, ignoring odd type text', () => {
    const CHK = ['Details', 'Posting Date', 'Description', 'Amount', 'Type', 'Balance']
    const t = csvRowToTransaction(CHK, ['DEBIT', '07/15/2026', 'SHELL OIL', '-45.00', 'ACH_DEBIT', '1000'], 'u', true)!
    expect(t).toMatchObject({ type: 'expense', amount: 45, description: 'SHELL OIL', date: '2026-07-15 00:00:00.000Z' })
  })

  it('handles separate Debit/Credit columns', () => {
    const BANK = ['Date', 'Description', 'Debit', 'Credit']
    expect(csvRowToTransaction(BANK, ['07/01/2026', 'Groceries', '80.00', ''], 'u')!).toMatchObject({ type: 'expense', amount: 80 })
    expect(csvRowToTransaction(BANK, ['07/02/2026', 'Deposit', '', '1200'], 'u')!).toMatchObject({ type: 'income', amount: 1200 })
  })
})

describe('hasSignedAmounts', () => {
  const H = ['Date', 'Description', 'Amount']
  it('detects a signed (Chase-style) file', () => {
    expect(hasSignedAmounts(H, [['07/01/2026', 'A', '-5'], ['07/02/2026', 'B', '10']])).toBe(true)
  })
  it('returns false for an all-positive file', () => {
    expect(hasSignedAmounts(H, [['07/01/2026', 'A', '5'], ['07/02/2026', 'B', '10']])).toBe(false)
  })
  it('finds the amount column index', () => {
    expect(amountColumnIndex(['Date', 'Amount', 'Type'])).toBe(1)
    expect(amountColumnIndex(['Date', 'Desc'])).toBe(-1)
  })
})
