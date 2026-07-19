import { describe, it, expect } from 'vitest'
import { mapTellerTxn, prettyCategory } from '../../../backend/pb_hooks/teller_lib.js'

describe('mapTellerTxn — Teller signed-amount convention', () => {
  it('treats a negative amount as an expense and stores the absolute value', () => {
    const t = mapTellerTxn({ id: 'txn_1', amount: '-8.55', date: '2026-07-15', description: 'Coffee' }, 'u1')
    expect(t).toMatchObject({ type: 'expense', amount: 8.55, description: 'Coffee', plaidId: 'txn_1' })
  })

  it('treats a positive amount as income', () => {
    const t = mapTellerTxn({ id: 'txn_2', amount: '1200.00', date: '2026-07-01', description: 'Payroll' }, 'u1')
    expect(t).toMatchObject({ type: 'income', amount: 1200, description: 'Payroll' })
  })

  it('prettifies the Teller enrichment category', () => {
    const t = mapTellerTxn({ id: 'txn_3', amount: '-20', details: { category: 'dining' } }, 'u')
    expect(t.category).toBe('Dining')
    const g = mapTellerTxn({ id: 'txn_4', amount: '-20', details: { category: 'general_merchandise' } }, 'u')
    expect(g.category).toBe('General Merchandise')
  })

  it('appends a midnight-UTC time to the date and carries the id as plaidId', () => {
    const t = mapTellerTxn({ id: 'txn_9', amount: '-5', date: '2026-07-15' }, 'user_7')
    expect(t.date).toBe('2026-07-15 00:00:00.000Z')
    expect(t.plaidId).toBe('txn_9')
    expect(t.userId).toBe('user_7')
  })

  it('coerces a non-numeric amount to 0 (never NaN)', () => {
    expect(mapTellerTxn({ id: 'x', amount: 'oops' }, 'u').amount).toBe(0)
  })

  it('defaults category/description when absent', () => {
    const t = mapTellerTxn({ id: 'x', amount: '-1' }, 'u')
    expect(t.category).toBe('Uncategorized')
    expect(t.description).toBe('Transaction')
  })
})

describe('prettyCategory', () => {
  it('title-cases and de-underscores', () => {
    expect(prettyCategory('dining')).toBe('Dining')
    expect(prettyCategory('general_merchandise')).toBe('General Merchandise')
    expect(prettyCategory('')).toBe('Uncategorized')
  })
})
