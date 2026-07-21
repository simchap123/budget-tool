import { describe, it, expect } from 'vitest'
import { buildReportSheets, buildBudgetSheets, transactionsSheet } from './reportExport'

const txns = [
  { id: '1', amount: 6.75, type: 'expense', category: 'Coffee', description: 'STARBUCKS', date: '2026-07-18' },
  { id: '2', amount: 2400, type: 'income', category: 'Salary', description: 'PAYROLL', date: '2026-07-15' },
]

describe('buildReportSheets', () => {
  const sheets = buildReportSheets({
    groupLabel: 'Category',
    valueLabel: 'Spending',
    rangeLabel: 'Jul 2026',
    rows: [
      { key: 'Coffee', label: 'Coffee', value: 100, count: 4 },
      { key: 'Gas', label: 'Gas', value: 50, count: 2 },
    ],
    total: 150,
    years: 0.5,
    months: 6,
    showAvgPerYear: true,
    txns,
    totals: { income: 2400, expense: 150, net: 2250, savingsRate: 93.75, count: 2 },
  })

  it('produces Summary, Breakdown, and Transactions sheets', () => {
    expect(sheets.map((s) => s.name)).toEqual(['Summary', 'Spending by Category', 'Transactions'])
  })

  it('adds Avg / month and Avg / year columns', () => {
    const breakdown = sheets[1]
    expect(breakdown.columns.some((c) => c.key === 'avgPerMonth')).toBe(true)
    expect(breakdown.columns.some((c) => c.key === 'avgPerYear')).toBe(true)
    // 100 over 6 months = ~16.67/mo; over 0.5 years = 200/yr
    expect(breakdown.rows[0]).toMatchObject({ label: 'Coffee', value: 100, avgPerYear: 200 })
    expect((breakdown.rows[0] as any).avgPerMonth).toBeCloseTo(16.67, 1)
  })

  it('computes % of total', () => {
    expect(sheets[1].rows[0].pct).toBe('67%')
    expect(sheets[1].rows[1].pct).toBe('33%')
  })

  it('omits Avg / year when showAvgPerYear is false', () => {
    const s = buildReportSheets({
      groupLabel: 'Month', valueLabel: 'Spending', rangeLabel: '2026', rows: [], total: 0,
      years: 1, months: 12, showAvgPerYear: false, txns: [], totals: { income: 0, expense: 0, net: 0, savingsRate: 0, count: 0 },
    })
    expect(s[1].columns.some((c) => c.key === 'avgPerYear')).toBe(false)
  })
})

describe('transactionsSheet', () => {
  it('signs amounts so income is positive and expense negative', () => {
    const rows = transactionsSheet(txns).rows
    expect(rows.find((r) => r.description === 'STARBUCKS')!.amount).toBe(-6.75)
    expect(rows.find((r) => r.description === 'PAYROLL')!.amount).toBe(2400)
  })
})

describe('buildBudgetSheets', () => {
  it('lays out a budget-vs-actual variance sheet', () => {
    const sheets = buildBudgetSheets('Jul 2026', [{ category: 'Coffee', budget: 40, spent: 6.75, remaining: 33.25 }], txns)
    expect(sheets.map((s) => s.name)).toEqual(['Summary', 'Budget vs actual', 'Transactions'])
    expect(sheets[1].rows[0]).toMatchObject({ category: 'Coffee', budget: 40, spent: 6.75, remaining: 33.25 })
  })
})
