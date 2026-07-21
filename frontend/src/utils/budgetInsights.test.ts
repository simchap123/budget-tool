import { describe, it, expect } from 'vitest'
import { vendorSpendInCategory, recurringByCategory, recurringKeySet, fixedFlexible } from './budgetInsights'

describe('fixedFlexible', () => {
  it('splits a budget into committed recurring and flexible remainder', () => {
    expect(fixedFlexible(400, 150)).toEqual({ fixed: 150, flexible: 250, over: 0 })
  })
  it('caps fixed at the budget and reports the overflow when recurring exceeds it', () => {
    expect(fixedFlexible(100, 160)).toEqual({ fixed: 100, flexible: 0, over: 60 })
  })
  it('handles a zero budget', () => {
    expect(fixedFlexible(0, 50)).toEqual({ fixed: 0, flexible: 0, over: 50 })
  })
})

describe('vendorSpendInCategory', () => {
  const txns = [
    { description: 'STARBUCKS 1', category: 'Coffee', type: 'expense', amount: 6, date: '2026-07-01' },
    { description: 'STARBUCKS 2', category: 'Coffee', type: 'expense', amount: 4, date: '2026-07-08' },
    { description: 'PEETS', category: 'Coffee', type: 'expense', amount: 12, date: '2026-07-10' },
    { description: 'WHOLEFOODS', category: 'Groceries', type: 'expense', amount: 80, date: '2026-07-05' },
  ]
  it('groups a category’s spend by merchant, biggest first', () => {
    const rows = vendorSpendInCategory(txns, 'Coffee')
    expect(rows.map((r) => [r.label, r.spent])).toEqual([
      ['Peets', 12],
      ['Starbucks', 10],
    ])
  })
  it('ignores other categories and income', () => {
    expect(vendorSpendInCategory(txns, 'Groceries').map((r) => r.label)).toEqual(['Wholefoods'])
  })
})

describe('recurringByCategory', () => {
  // Netflix: same amount across 3 months → recurring, category Streaming.
  const txns = [
    { description: 'NETFLIX', category: 'Streaming', type: 'expense', amount: 15.99, date: '2026-05-02' },
    { description: 'NETFLIX', category: 'Streaming', type: 'expense', amount: 15.99, date: '2026-06-02' },
    { description: 'NETFLIX', category: 'Streaming', type: 'expense', amount: 15.99, date: '2026-07-02' },
    // Groceries vary → not recurring
    { description: 'WHOLEFOODS', category: 'Groceries', type: 'expense', amount: 40, date: '2026-06-05' },
    { description: 'WHOLEFOODS', category: 'Groceries', type: 'expense', amount: 95, date: '2026-07-05' },
  ]
  it('attributes recurring monthly spend to its dominant category', () => {
    const byCat = recurringByCategory(txns)
    expect(byCat.Streaming).toBeTruthy()
    expect(byCat.Streaming.monthly).toBeGreaterThan(14)
    expect(byCat.Streaming.monthly).toBeLessThan(18)
    expect(byCat.Streaming.vendors[0].label).toMatch(/Netflix/i)
  })
  it('excludes variable-amount categories', () => {
    expect(recurringByCategory(txns).Groceries).toBeUndefined()
  })
  it('recurringKeySet flags the recurring merchant', () => {
    const keys = recurringKeySet(txns)
    expect(keys.has('NETFLIX')).toBe(true)
    expect(keys.has('WHOLEFOODS')).toBe(false)
  })
})
