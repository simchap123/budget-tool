// Suggests a per-category budget from spending history, using a chosen
// statistical basis over each category's monthly totals. Pure and testable so
// the onboarding wizard and the Budget page's "Suggest" both draw from one
// source of truth.

export type BudgetBasis = 'avg6' | 'avg12' | 'median' | 'high' | 'low'

export const BASIS_OPTIONS: { value: BudgetBasis; label: string; hint: string }[] = [
  { value: 'avg6', label: 'Average · last 6 months', hint: 'Typical recent spend' },
  { value: 'avg12', label: 'Average · last 12 months', hint: 'Typical spend over a year' },
  { value: 'median', label: 'Median month', hint: 'Middle month — ignores outliers' },
  { value: 'high', label: 'Highest month', hint: 'A safe ceiling' },
  { value: 'low', label: 'Lowest month', hint: 'A lean target' },
]

interface BasisTxn {
  amount: number | string
  type: string
  category?: string
  date?: string
}

const num = (a: number | string) => {
  const n = typeof a === 'string' ? parseFloat(a) : a
  return Number.isFinite(n) ? n : 0
}

// 'YYYY-MM' of the month `count` months back from `today`, inclusive window
// start. months=12, today=2026-07 → 2025-08 (covers Aug 2025 … Jul 2026).
function windowStartYm(today: Date, count: number): string {
  const idx = today.getFullYear() * 12 + today.getMonth() - (count - 1)
  const y = Math.floor(idx / 12)
  const m = (idx % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// Per-category suggested budget. Monthly totals are taken over the months a
// category actually had spend (so a category seen in 3 of 12 months is judged
// on those 3), consistent across every basis so they stay comparable.
export function suggestBudgets(
  txns: BasisTxn[],
  basis: BudgetBasis,
  today: Date
): Record<string, number> {
  const lookback = basis === 'avg6' ? 6 : 12
  const startYm = windowStartYm(today, lookback)

  const byCat: Record<string, Record<string, number>> = {}
  for (const t of txns) {
    if (t.type !== 'expense') continue
    const amt = num(t.amount)
    if (!(amt > 0)) continue
    const ym = String(t.date || '').slice(0, 7)
    if (ym.length !== 7 || ym < startYm) continue
    const cat = t.category || 'Uncategorized'
    if (!byCat[cat]) byCat[cat] = {}
    byCat[cat][ym] = (byCat[cat][ym] || 0) + amt
  }

  const result: Record<string, number> = {}
  for (const cat of Object.keys(byCat)) {
    const totals = Object.values(byCat[cat])
    if (!totals.length) continue
    let value: number
    switch (basis) {
      case 'avg6':
      case 'avg12':
        value = totals.reduce((a, b) => a + b, 0) / totals.length
        break
      case 'high':
        value = Math.max(...totals)
        break
      case 'low':
        value = Math.min(...totals)
        break
      case 'median':
        value = median(totals)
        break
    }
    result[cat] = Math.round(value)
  }
  return result
}
