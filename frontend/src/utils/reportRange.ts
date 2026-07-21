// Resolves the Reports date-range control into a concrete [start, endExclusive)
// window plus a human label. All math is on calendar-month boundaries and done
// with plain integer arithmetic (no Date parsing of "YYYY-MM-DD" strings, which
// shifts a day in negative-UTC timezones), so ranges never drift.

export type RangePreset =
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'last-12-months'
  | 'this-year'
  | 'last-year'
  | 'ytd'
  | 'all-time'
  | 'custom'

export interface ResolvedRange {
  // Inclusive start / exclusive end as 'YYYY-MM-DD'. Empty strings mean unbounded
  // (all-time), which the caller turns into an unfiltered fetch.
  start: string
  endExclusive: string
  label: string
}

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'last-6-months', label: 'Last 6 months' },
  { value: 'last-12-months', label: 'Last 12 months' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-year', label: 'Last year' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all-time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

// Fractional number of years a range covers, used to annualize totals into an
// "average per year" figure. For a bounded range it's the [start, endExclusive)
// span; for an unbounded (all-time) range it falls back to the span of the
// supplied transaction dates. Never returns 0, so callers can divide safely.
export function yearsInRange(start: string, endExclusive: string, dates: string[] = []): number {
  let s = start
  let e = endExclusive
  if (!s || !e) {
    const sorted = dates.map((d) => String(d || '').slice(0, 10)).filter((d) => d.length === 10).sort()
    if (sorted.length === 0) return 1
    s = sorted[0]
    const [ly, lm, ld] = sorted[sorted.length - 1].split('-').map(Number)
    const next = new Date(ly, lm - 1, ld + 1) // exclusive end = last day + 1
    e = ymd(next.getFullYear(), next.getMonth() + 1, next.getDate())
  }
  const days = (Date.parse(e) - Date.parse(s)) / 86_400_000
  return days > 0 ? days / 365.25 : 1 / 365.25
}

// First day of the calendar month `delta` months away from year/month (1-based).
function firstOfMonth(year: number, month1: number, delta: number): string {
  // Convert to a 0-based absolute month index to shift cleanly across years.
  const idx = year * 12 + (month1 - 1) + delta
  const y = Math.floor(idx / 12)
  const m = (idx % 12) + 1
  return ymd(y, m, 1)
}

function monthSpanLabel(startYmd: string, endExclusiveYmd: string): string {
  const short = (s: string) => {
    const [y, m] = s.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  // endExclusive is the first of the month AFTER the last included month.
  const [ey, em] = endExclusiveYmd.split('-').map(Number)
  const lastIncluded = firstOfMonth(ey, em, -1)
  return short(startYmd) === short(lastIncluded)
    ? short(startYmd)
    : `${short(startYmd)} – ${short(lastIncluded)}`
}

// `today` is injected so this stays a pure function (testable, and safe inside
// the workflow/runtime that forbids argless Date). Pass `new Date()` in the app.
export function resolveRange(
  preset: RangePreset,
  today: Date,
  customStart?: string,
  customEnd?: string
): ResolvedRange {
  const y = today.getFullYear()
  const m = today.getMonth() + 1 // 1-based
  const d = today.getDate()

  switch (preset) {
    case 'this-month': {
      const start = firstOfMonth(y, m, 0)
      return { start, endExclusive: firstOfMonth(y, m, 1), label: monthSpanLabel(start, firstOfMonth(y, m, 1)) }
    }
    case 'last-month': {
      const start = firstOfMonth(y, m, -1)
      const end = firstOfMonth(y, m, 0)
      return { start, endExclusive: end, label: monthSpanLabel(start, end) }
    }
    case 'last-3-months': {
      const start = firstOfMonth(y, m, -2)
      const end = firstOfMonth(y, m, 1)
      return { start, endExclusive: end, label: monthSpanLabel(start, end) }
    }
    case 'last-6-months': {
      const start = firstOfMonth(y, m, -5)
      const end = firstOfMonth(y, m, 1)
      return { start, endExclusive: end, label: monthSpanLabel(start, end) }
    }
    case 'last-12-months': {
      const start = firstOfMonth(y, m, -11)
      const end = firstOfMonth(y, m, 1)
      return { start, endExclusive: end, label: monthSpanLabel(start, end) }
    }
    case 'this-year':
      return { start: ymd(y, 1, 1), endExclusive: ymd(y + 1, 1, 1), label: String(y) }
    case 'last-year':
      return { start: ymd(y - 1, 1, 1), endExclusive: ymd(y, 1, 1), label: String(y - 1) }
    case 'ytd': {
      // Through today inclusive → exclusive end is tomorrow.
      const end = new Date(y, m - 1, d + 1)
      const endStr = ymd(end.getFullYear(), end.getMonth() + 1, end.getDate())
      return { start: ymd(y, 1, 1), endExclusive: endStr, label: `${y} year to date` }
    }
    case 'all-time':
      return { start: '', endExclusive: '', label: 'All time' }
    case 'custom': {
      if (!customStart || !customEnd) {
        return { start: '', endExclusive: '', label: 'All time' }
      }
      // customEnd is inclusive in the UI; make the filter exclusive by +1 day.
      const [ey, em, ed] = customEnd.split('-').map(Number)
      const nextDay = new Date(ey, em - 1, ed + 1)
      const endExclusive = ymd(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate())
      return { start: customStart, endExclusive, label: `${customStart} → ${customEnd}` }
    }
  }
}
