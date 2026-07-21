import { describe, it, expect } from 'vitest'
import { buildIncomeStatement } from './incomeStatement'

const txns = [
  { amount: 1000, type: 'income', category: 'Salary', date: '2026-01-15' },
  { amount: 1200, type: 'income', category: 'Salary', date: '2026-02-15' },
  { amount: 200, type: 'expense', category: 'Groceries', date: '2026-01-10' },
  { amount: 300, type: 'expense', category: 'Groceries', date: '2026-02-10' },
  { amount: 50, type: 'expense', category: 'Gas', date: '2026-02-20' },
  { amount: 500, type: 'income', category: 'Salary', date: '2025-12-15' }, // prior year
]

describe('buildIncomeStatement — monthly', () => {
  const is = buildIncomeStatement(txns, 'month', 2026)

  it('has 12 month columns plus Full Year', () => {
    expect(is.columns).toHaveLength(13)
    expect(is.columns[12]).toBe('Full Year')
  })

  it('puts income and expense in the right sections with per-month values', () => {
    const salary = is.income.find((r) => r.label === 'Salary')!
    expect(salary.values[0]).toBe(1000) // Jan
    expect(salary.values[1]).toBe(1200) // Feb
    expect(salary.values[12]).toBe(2200) // Full Year (excludes prior-year 500)
    const groceries = is.expense.find((r) => r.label === 'Groceries')!
    expect(groceries.values[12]).toBe(500)
  })

  it('computes totals and net per column', () => {
    expect(is.totalIncome[12]).toBe(2200)
    expect(is.totalExpense[12]).toBe(550) // 500 groceries + 50 gas
    expect(is.net[12]).toBe(1650)
    expect(is.net[0]).toBe(1000 - 200) // Jan net
  })
})

describe('buildIncomeStatement — yearly', () => {
  const is = buildIncomeStatement(txns, 'year')
  it('has one column per year present plus Total', () => {
    expect(is.columns).toEqual(['2025', '2026', 'Total'])
  })
  it('sums each category by year', () => {
    const salary = is.income.find((r) => r.label === 'Salary')!
    expect(salary.values[0]).toBe(500) // 2025
    expect(salary.values[1]).toBe(2200) // 2026
    expect(salary.values[2]).toBe(2700) // Total
  })
})
