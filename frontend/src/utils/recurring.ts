import { merchantKey } from './merchant'

export interface RawTxn {
  description: string
  amount: number | string
  type: string
  date: string
  category?: string
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

// Median days between consecutive (sorted, de-duped) dates. Median is robust to
// bills that post as two nearby charges (which would skew a mean interval).
function medianInterval(sortedDates: string[]): number {
  if (sortedDates.length < 2) return 30
  const gaps: number[] = []
  for (let i = 1; i < sortedDates.length; i++) {
    const a = new Date(sortedDates[i - 1] + 'T00:00:00Z').getTime()
    const b = new Date(sortedDates[i] + 'T00:00:00Z').getTime()
    gaps.push((b - a) / DAY_MS)
  }
  gaps.sort((x, y) => x - y)
  const mid = Math.floor(gaps.length / 2)
  return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2
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
    // De-dupe to distinct billing days so split/same-day charges count once.
    const uniqueDates = Array.from(new Set(g.dates)).sort()
    if (uniqueDates.length < 2) continue // needs to recur on >= 2 distinct days
    const months = new Set(uniqueDates.map((d) => d.slice(0, 7)))
    if (months.size < 2) continue // must span >= 2 months (not a one-off burst)
    const min = Math.min(...g.amounts)
    const max = Math.max(...g.amounts)
    if (min <= 0 || max / min > 1.6) continue // amounts must be consistent

    const avg = g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length
    const lastDate = uniqueDates[uniqueDates.length - 1]
    const interval = medianInterval(uniqueDates)
    const nextDate = new Date(new Date(lastDate + 'T00:00:00Z').getTime() + interval * DAY_MS)
      .toISOString()
      .slice(0, 10)
    // Cadence-aware monthly cost (weekly charges cost ~4x their amount / month).
    const monthlyEstimate = avg * (30 / Math.max(interval, 1))

    items.push({
      key,
      label: g.sample.trim().replace(/\s+/g, ' ').slice(0, 44),
      count: uniqueDates.length,
      avgAmount: avg,
      lastDate,
      avgIntervalDays: Math.round(interval),
      nextDate,
      monthlyEstimate,
    })
  }

  return items.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
}

// From detected recurring items, the ones whose next expected date falls within
// the next `withinDays`, soonest first. Stale forecasts (next date already past)
// are excluded.
export function upcomingBills(
  items: RecurringItem[],
  todayYmd: string,
  withinDays = 21
): RecurringItem[] {
  const today = new Date(todayYmd + 'T00:00:00Z').getTime()
  const horizon = today + withinDays * DAY_MS
  return items
    .filter((i) => {
      const next = new Date(i.nextDate + 'T00:00:00Z').getTime()
      return next >= today && next <= horizon
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
}
