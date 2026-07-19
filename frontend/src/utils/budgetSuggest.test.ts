import { describe, it, expect } from 'vitest'
import { averageMonthlySpend } from './budgetSuggest'
import { RawTxn } from './recurring'

const t = (category: string, amount: number, date: string): RawTxn => ({
  description: category, amount, type: 'expense', category, date: `${date} 00:00:00.000Z`,
})

describe('averageMonthlySpend', () => {
  it('averages over the months a category actually appears in', () => {
    const avg = averageMonthlySpend([
      t('Grocery', 100, '2026-06-05'),
      t('Grocery', 300, '2026-06-20'),
      t('Grocery', 200, '2026-07-10'),
    ])
    // June total 400, July total 200 -> (600 / 2 months) = 300
    expect(avg.Grocery).toBe(300)
  })

  it('ignores income', () => {
    const avg = averageMonthlySpend([
      { description: 'pay', amount: 5000, type: 'income', category: 'Paychecks', date: '2026-07-01' },
    ])
    expect(avg.Paychecks).toBeUndefined()
  })

  it('handles string amounts and defaults missing category', () => {
    const avg = averageMonthlySpend([
      { description: 'x', amount: '50', type: 'expense', category: '', date: '2026-07-01' },
    ])
    expect(avg.Uncategorized).toBe(50)
  })
})
