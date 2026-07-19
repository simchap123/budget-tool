import { describe, it, expect } from 'vitest'
// The Plaid mapping is the backend's canonical source; import it directly so this
// test guards the real function (no duplicated logic that could drift).
import { mapTxn } from '../../../backend/pb_hooks/plaid_lib.js'

// The single most important invariant in the whole Plaid integration:
// Plaid amount > 0 means money OUT (expense); amount < 0 means money IN (income).
// A regression here silently misclassifies every synced transaction.
describe('mapTxn — amount sign convention', () => {
  it('treats a positive amount as an expense and stores the absolute value', () => {
    const t = mapTxn({ amount: 42.5, name: 'Coffee', transaction_id: 'x' }, 'u1')
    expect(t.type).toBe('expense')
    expect(t.amount).toBe(42.5)
  })
  it('treats a negative amount as income and stores the absolute value', () => {
    const t = mapTxn({ amount: -1200, name: 'Payroll', transaction_id: 'x' }, 'u1')
    expect(t.type).toBe('income')
    expect(t.amount).toBe(1200)
  })
})

describe('mapTxn — description', () => {
  it('prefers merchant_name over the raw name', () => {
    expect(mapTxn({ amount: 1, merchant_name: 'Starbucks', name: 'SQ *STARBUCKS #123', transaction_id: 'x' }, 'u').description).toBe('Starbucks')
  })
  it('falls back to name when there is no merchant_name', () => {
    expect(mapTxn({ amount: 1, name: 'ACH DEBIT', transaction_id: 'x' }, 'u').description).toBe('ACH DEBIT')
  })
  it('falls back to "Transaction" when neither is present', () => {
    expect(mapTxn({ amount: 1, transaction_id: 'x' }, 'u').description).toBe('Transaction')
  })
})

describe('mapTxn — category', () => {
  it('prettifies the personal_finance_category primary', () => {
    const t = mapTxn({ amount: 1, transaction_id: 'x', personal_finance_category: { primary: 'FOOD_AND_DRINK' } }, 'u')
    expect(t.category).toBe('Food And Drink')
  })
  it('falls back to the legacy category array', () => {
    expect(mapTxn({ amount: 1, transaction_id: 'x', category: ['Travel'] }, 'u').category).toBe('Travel')
  })
  it('falls back to "Uncategorized" when no category is provided', () => {
    expect(mapTxn({ amount: 1, transaction_id: 'x' }, 'u').category).toBe('Uncategorized')
  })
})

describe('mapTxn — passthrough fields', () => {
  it('appends a midnight-UTC time to the date and carries id + userId', () => {
    const t = mapTxn({ amount: 1, transaction_id: 'txn_9', date: '2026-07-15' }, 'user_7')
    expect(t.date).toBe('2026-07-15 00:00:00.000Z')
    expect(t.plaidId).toBe('txn_9')
    expect(t.userId).toBe('user_7')
  })
})
