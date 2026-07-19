import { RawTxn } from './recurring'

// Average monthly expense per category over the months actually present in the
// data (so a category seen in 2 of 4 months averages over 2, not 4).
export function averageMonthlySpend(txns: RawTxn[]): Record<string, number> {
  const byCat: Record<string, { total: number; months: Set<string> }> = {}
  for (const t of txns) {
    if (t.type !== 'expense') continue
    const amt = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
    if (!(amt > 0)) continue
    const cat = t.category || 'Uncategorized'
    const month = String(t.date).slice(0, 7)
    if (!byCat[cat]) byCat[cat] = { total: 0, months: new Set() }
    byCat[cat].total += amt
    byCat[cat].months.add(month)
  }
  const result: Record<string, number> = {}
  for (const cat of Object.keys(byCat)) {
    const { total, months } = byCat[cat]
    // round to a tidy whole dollar
    result[cat] = Math.round(total / Math.max(months.size, 1))
  }
  return result
}
