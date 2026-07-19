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
})
