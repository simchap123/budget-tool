import { describe, it, expect } from 'vitest'
import { categorySpendingTrend } from './categoryTrend'
import { RawTxn } from './recurring'

const t = (category: string, amount: number, date: string): RawTxn => ({
  description: category, amount, type: 'expense', category, date: `${date} 00:00:00.000Z`,
})

describe('categorySpendingTrend', () => {
  it('sums expenses per month per category and sorts months ascending', () => {
    const { data, categories } = categorySpendingTrend([
      t('Grocery', 100, '2026-06-05'),
      t('Grocery', 50, '2026-06-20'),
      t('Grocery', 200, '2026-07-01'),
      t('Rent', 1000, '2026-06-01'),
      t('Rent', 1000, '2026-07-01'),
    ])
    expect(categories).toEqual(['Rent', 'Grocery']) // by total spend, desc
    expect(data).toEqual([
      { month: '2026-06', Rent: 1000, Grocery: 150 },
      { month: '2026-07', Rent: 1000, Grocery: 200 },
    ])
  })

  it('limits to the top-N categories', () => {
    const { categories } = categorySpendingTrend(
      [t('A', 100, '2026-06-01'), t('B', 90, '2026-06-01'), t('C', 80, '2026-06-01')],
      2
    )
    expect(categories).toEqual(['A', 'B'])
  })

  it('fills 0 for a category absent in a given month', () => {
    const { data } = categorySpendingTrend([
      t('Grocery', 100, '2026-06-01'),
      t('Grocery', 100, '2026-07-01'),
      t('Travel', 500, '2026-07-01'),
    ])
    expect(data[0]).toEqual({ month: '2026-06', Travel: 0, Grocery: 100 })
  })

  it('ignores income', () => {
    const { categories } = categorySpendingTrend([
      { description: 'pay', amount: 5000, type: 'income', category: 'Paychecks', date: '2026-07-01' },
    ])
    expect(categories).toEqual([])
  })
})
