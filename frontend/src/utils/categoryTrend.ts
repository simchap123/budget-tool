import { RawTxn } from './recurring'

export interface TrendPoint {
  month: string
  [category: string]: number | string
}

// Build a per-month spending series for the top-N expense categories, so a
// stacked/grouped chart can show how each category trends over time.
export function categorySpendingTrend(
  txns: RawTxn[],
  topN = 5
): { data: TrendPoint[]; categories: string[] } {
  const byMonthCat: Record<string, Record<string, number>> = {}
  const catTotals: Record<string, number> = {}

  for (const t of txns) {
    if (t.type !== 'expense') continue
    const amt = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
    if (!(amt > 0)) continue
    const month = String(t.date).slice(0, 7)
    const cat = t.category || 'Uncategorized'
    if (!byMonthCat[month]) byMonthCat[month] = {}
    byMonthCat[month][cat] = (byMonthCat[month][cat] || 0) + amt
    catTotals[cat] = (catTotals[cat] || 0) + amt
  }

  const categories = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([c]) => c)

  const data: TrendPoint[] = Object.keys(byMonthCat)
    .sort()
    .map((month) => {
      const point: TrendPoint = { month }
      for (const cat of categories) {
        point[cat] = Math.round((byMonthCat[month][cat] || 0) * 100) / 100
      }
      return point
    })

  return { data, categories }
}
