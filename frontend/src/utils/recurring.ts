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
  avgIntervalDays: number
  nextDate: string
  monthlyEstimate: number
}

const DAY_MS = 86400000

// Average days between consecutive (sorted) dates.
function avgInterval(sortedDates: string[]): number {
  if (sortedDates.length < 2) return 30
  let total = 0
  for (let i = 1; i < sortedDates.length; i++) {
    const a = new Date(sortedDates[i - 1] + 'T00:00:00Z').getTime()
    const b = new Date(sortedDates[i] + 'T00:00:00Z').getTime()
    total += (b - a) / DAY_MS
  }
  return total / (sortedDates.length - 1)
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
    const sortedDates = g.dates.slice().sort()
    const lastDate = sortedDates[sortedDates.length - 1]
    const interval = avgInterval(sortedDates)
    const nextDate = new Date(new Date(lastDate + 'T00:00:00Z').getTime() + interval * DAY_MS)
      .toISOString()
      .slice(0, 10)
    // Cadence-aware monthly cost (weekly charges cost ~4x their amount / month).
    const monthlyEstimate = avg * (30 / Math.max(interval, 1))

    items.push({
      key,
      label: g.sample.trim().replace(/\s+/g, ' ').slice(0, 44),
      count: g.amounts.length,
      avgAmount: avg,
      lastDate,
      avgIntervalDays: Math.round(interval),
      nextDate,
      monthlyEstimate,
    })
  }

  return items.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
}
