import { describe, it, expect } from 'vitest'
import { computeGiving } from './givingCalc'

const txns = [
  { date: '2026-07-05 00:00:00.000Z', type: 'income', amount: 5000 },
  { date: '2026-07-10 00:00:00.000Z', type: 'expense', amount: 300, category: 'Charity' },
  { date: '2026-07-12 00:00:00.000Z', type: 'expense', amount: 80, category: 'Groceries' }, // not giving
  { date: '2026-08-05 00:00:00.000Z', type: 'income', amount: 5000 },
  { date: '2026-08-20 00:00:00.000Z', type: 'expense', amount: 700, category: 'charity' }, // case-insensitive
]

describe('computeGiving', () => {
  it('computes per-month income, target (% of income), and given', () => {
    const s = computeGiving(txns, 10, 'Charity')
    expect(s.months).toHaveLength(2)
    expect(s.months[0]).toMatchObject({ month: '2026-07', income: 5000, target: 500, given: 300, remaining: 200 })
    expect(s.months[1]).toMatchObject({ month: '2026-08', income: 5000, target: 500, given: 700, remaining: -200 })
  })

  it('only counts expenses in the giving category, ignoring other spend', () => {
    // Groceries (80) must not count toward giving.
    expect(computeGiving(txns, 10, 'Charity').totalGiven).toBe(1000)
  })

  it('reports a cumulative balance (ahead/behind the target)', () => {
    const s = computeGiving(txns, 10, 'Charity')
    expect(s.totalTarget).toBe(1000)
    expect(s.totalGiven).toBe(1000)
    expect(s.balance).toBe(0) // exactly on track across the two months
  })

  it('shows a negative balance when giving is behind the target', () => {
    const behind = computeGiving([{ date: '2026-07-01 00:00:00.000Z', type: 'income', amount: 1000 }], 10, 'Charity')
    expect(behind.totalTarget).toBe(100)
    expect(behind.totalGiven).toBe(0)
    expect(behind.balance).toBe(-100)
  })

  it('handles no matching category / empty input', () => {
    expect(computeGiving([], 10, 'Charity').months).toEqual([])
  })
})
