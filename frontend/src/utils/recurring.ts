import { merchantKey } from './merchant'

export interface RawTxn {
  description: string
  amount: number | string
  type: string
  date: string
}

export interface RecurringItem {
  key: string
  label: string
  count: number
  avgAmount: number
  lastDate: string
  monthlyEstimate: number
}

// Detect recurring expenses (subscriptions / bills): same merchant, consistent
// amount, appearing across multiple months. Variable spend (groceries, etc.) is
// excluded because its amounts aren't consistent.
export function detectRecurring(txns: RawTxn[]): RecurringItem[] {
  const groups: Record<string, { amounts: number[]; dates: string[]; sample: string }> = {}

  for (const t of txns) {
    if (t.type !== 'expense') continue
    const amt = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
    if (!(amt > 0)) continue
    const key = merchantKey(t.description)
    if (key === 'OTHER') continue
    if (!groups[key]) groups[key] = { amounts: [], dates: [], sample: t.description }
    groups[key].amounts.push(amt)
    groups[key].dates.push(String(t.date).slice(0, 10))
  }

  const items: RecurringItem[] = []
  for (const key of Object.keys(groups)) {
    const g = groups[key]
    if (g.amounts.length < 2) continue // needs repetition
    const months = new Set(g.dates.map((d) => d.slice(0, 7)))
    if (months.size < 2) continue // must span >= 2 months (not a one-off burst)
    const min = Math.min(...g.amounts)
    const max = Math.max(...g.amounts)
    if (min <= 0 || max / min > 1.6) continue // amounts must be consistent

    const avg = g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length
    items.push({
      key,
      label: g.sample.trim().replace(/\s+/g, ' ').slice(0, 44),
      count: g.amounts.length,
      avgAmount: avg,
      lastDate: g.dates.slice().sort().slice(-1)[0],
      monthlyEstimate: avg,
    })
  }

  return items.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
}
