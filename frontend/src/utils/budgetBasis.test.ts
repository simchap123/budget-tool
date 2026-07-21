import { describe, it, expect } from 'vitest'
import { suggestBudgets } from './budgetBasis'

const TODAY = new Date(2026, 6, 15) // 2026-07

// Groceries: 999 (Oct'25 — inside 12mo, outside 6mo), 100 (May), 200 (Jun), 300 (Jul).
// Coffee: 40 (Jul) only.
const txns = [
  { amount: 100, type: 'expense', category: 'Groceries', date: '2026-05-10' },
  { amount: 200, type: 'expense', category: 'Groceries', date: '2026-06-10' },
  { amount: 300, type: 'expense', category: 'Groceries', date: '2026-07-10' },
  { amount: 40, type: 'expense', category: 'Coffee', date: '2026-07-05' },
  { amount: 999, type: 'expense', category: 'Groceries', date: '2025-10-10' },
  { amount: 5000, type: 'income', category: 'Salary', date: '2026-07-01' }, // ignored
]

describe('suggestBudgets', () => {
  it('avg12 averages the monthly totals across the 12-month window', () => {
    // Groceries months: Oct'25 999, May 100, Jun 200, Jul 300 → avg 399.75 → 400
    expect(suggestBudgets(txns, 'avg12', TODAY).Groceries).toBe(400)
  })

  it('avg6 excludes anything older than 6 months', () => {
    // Last 6 months (Feb'26→Jul'26): only May/Jun/Jul → (100+200+300)/3 = 200
    expect(suggestBudgets(txns, 'avg6', TODAY).Groceries).toBe(200)
  })

  it('median takes the middle monthly total', () => {
    // avg12 Groceries months sorted: 100,200,300,999 → median (200+300)/2 = 250
    expect(suggestBudgets(txns, 'median', TODAY).Groceries).toBe(250)
  })

  it('high takes the largest month, low the smallest', () => {
    expect(suggestBudgets(txns, 'high', TODAY).Groceries).toBe(999)
    expect(suggestBudgets(txns, 'low', TODAY).Groceries).toBe(100)
  })

  it('ignores income and single-month categories work', () => {
    const r = suggestBudgets(txns, 'avg12', TODAY)
    expect(r.Salary).toBeUndefined()
    expect(r.Coffee).toBe(40)
  })

  it('rounds to whole dollars', () => {
    const r = suggestBudgets(
      [
        { amount: 10.5, type: 'expense', category: 'X', date: '2026-07-01' },
        { amount: 21.4, type: 'expense', category: 'X', date: '2026-06-01' },
      ],
      'avg12',
      TODAY
    )
    expect(Number.isInteger(r.X)).toBe(true)
  })
})
