import { describe, it, expect } from 'vitest'
import { groupTransactions, rowMatcher } from './reportEngine'

const txns = [
  { id: '1', amount: 6.75, type: 'expense', category: 'Coffee', description: 'STARBUCKS STORE 1234', date: '2026-07-18' },
  { id: '2', amount: 4.5, type: 'expense', category: 'Coffee', description: 'STARBUCKS STORE 9', date: '2026-07-02' },
  { id: '3', amount: 84.2, type: 'expense', category: 'Groceries', description: 'WHOLEFOODS MKT', date: '2026-06-17' },
  { id: '4', amount: 2400, type: 'income', category: 'Salary', description: 'PAYROLL DEPOSIT', date: '2026-07-15' },
]

describe('groupTransactions — by category', () => {
  it('sums expenses per category, ignoring income, sorted by magnitude', () => {
    const { rows, total } = groupTransactions(txns, 'category', 'expense')
    expect(rows.map((r) => [r.label, r.value, r.count])).toEqual([
      ['Groceries', 84.2, 1],
      ['Coffee', 11.25, 2],
    ])
    expect(total).toBeCloseTo(95.45)
  })

  it('income report lists only income buckets', () => {
    const { rows } = groupTransactions(txns, 'category', 'income')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ label: 'Salary', value: 2400, count: 1 })
  })

  it('net signs income positive and expense negative', () => {
    const { total } = groupTransactions(txns, 'category', 'net')
    expect(total).toBeCloseTo(2400 - 95.45)
  })

  it('mixed sums income AND expense magnitudes (gross throughput) per category', () => {
    const { rows, total } = groupTransactions(txns, 'category', 'mixed')
    // Salary (income) leads, then Groceries, then Coffee — all by magnitude.
    expect(rows.map((r) => [r.label, r.value, r.count])).toEqual([
      ['Salary', 2400, 1],
      ['Groceries', 84.2, 1],
      ['Coffee', 11.25, 2],
    ])
    // Total money moved = every income and expense magnitude summed.
    expect(total).toBeCloseTo(2400 + 95.45)
  })
})

describe('groupTransactions — by vendor', () => {
  it('groups on the normalized merchant key across noisy descriptions', () => {
    const { rows } = groupTransactions(txns, 'vendor', 'expense')
    const starbucks = rows.find((r) => r.label.toLowerCase() === 'starbucks')
    expect(starbucks?.value).toBeCloseTo(11.25)
    expect(starbucks?.count).toBe(2)
  })
})

describe('groupTransactions — by month', () => {
  it('buckets by YYYY-MM and sorts chronologically', () => {
    const { rows } = groupTransactions(txns, 'month', 'expense')
    expect(rows.map((r) => r.key)).toEqual(['2026-06', '2026-07'])
  })
})

describe('rowMatcher', () => {
  it('selects exactly the transactions behind a category row', () => {
    const match = rowMatcher('category', 'Coffee')
    expect(txns.filter(match).map((t) => t.id)).toEqual(['1', '2'])
  })
  it('selects the transactions behind a vendor row', () => {
    const match = rowMatcher('vendor', 'STARBUCKS')
    expect(txns.filter(match).map((t) => t.id)).toEqual(['1', '2'])
  })
})
