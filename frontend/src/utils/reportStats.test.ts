import { describe, it, expect } from 'vitest'
import { txAmount, reportTotals, categoryBreakdown, monthlyTrend } from './reportStats'

describe('txAmount', () => {
  it('parses string amounts and passes numbers through', () => {
    expect(txAmount({ amount: '12.50' })).toBe(12.5)
    expect(txAmount({ amount: 12.5 })).toBe(12.5)
  })
  it('coerces a non-numeric amount to 0 so it cannot poison a sum into NaN', () => {
    expect(txAmount({ amount: 'not-a-number' })).toBe(0)
  })
})

describe('reportTotals', () => {
  const txns = [
    { amount: '1000', type: 'income' },
    { amount: 250, type: 'expense' },
    { amount: '150.50', type: 'expense' },
  ]
  it('sums income and expense (string or number) and derives net', () => {
    const t = reportTotals(txns)
    expect(t.income).toBe(1000)
    expect(t.expense).toBe(400.5)
    expect(t.net).toBe(599.5)
    expect(t.count).toBe(3)
  })
  it('computes the savings rate as a percent of income', () => {
    expect(reportTotals(txns).savingsRate).toBeCloseTo(59.95, 2)
  })
  it('reports a 0 savings rate when there is no income (no divide-by-zero)', () => {
    expect(reportTotals([{ amount: 50, type: 'expense' }]).savingsRate).toBe(0)
  })
})

describe('categoryBreakdown', () => {
  it('rolls transactions up per category with income/expense/net/count', () => {
    const rows = categoryBreakdown([
      { amount: 100, type: 'expense', category: 'Food' },
      { amount: 40, type: 'expense', category: 'Food' },
      { amount: 500, type: 'income', category: 'Salary' },
    ])
    const food = rows.find((r) => r.name === 'Food')!
    expect(food).toMatchObject({ expense: 140, income: 0, count: 2, net: -140 })
    expect(rows.find((r) => r.name === 'Salary')!.net).toBe(500)
  })
  it('buckets a missing category under Uncategorized', () => {
    const rows = categoryBreakdown([{ amount: 10, type: 'expense' }])
    expect(rows[0].name).toBe('Uncategorized')
  })
})

describe('monthlyTrend', () => {
  it('groups by the calendar month of the stored date and sorts ascending', () => {
    const trend = monthlyTrend([
      { amount: 100, type: 'expense', date: '2026-06-30 00:00:00.000Z' },
      { amount: 200, type: 'expense', date: '2026-07-15 00:00:00.000Z' },
      { amount: 900, type: 'income', date: '2026-07-01 00:00:00.000Z' },
    ])
    expect(trend.map((p) => p.month)).toEqual(['2026-06', '2026-07'])
    expect(trend[1]).toMatchObject({ month: '2026-07', income: 900, expense: 200, net: 700 })
  })
  it('keeps a UTC-midnight first-of-month in its own month (no timezone shift)', () => {
    // new Date('2026-07-01 00:00:00.000Z') in a negative-UTC zone lands on Jun 30;
    // slicing the string keeps it in July regardless of the runner's timezone.
    const trend = monthlyTrend([{ amount: 5, type: 'expense', date: '2026-07-01 00:00:00.000Z' }])
    expect(trend[0].month).toBe('2026-07')
  })
  it('skips transactions with no usable date', () => {
    expect(monthlyTrend([{ amount: 5, type: 'expense', date: '' }])).toEqual([])
  })
})
