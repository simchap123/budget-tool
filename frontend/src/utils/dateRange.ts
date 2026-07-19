// Timezone-safe month range for a "YYYY-MM" string.
// Avoids `new Date("YYYY-MM-01")` + setMonth/setDate, which shifts by a day in
// negative-UTC-offset timezones and produced a broken filter (end === start).
export function monthRange(ym: string): { start: string; endExclusive: string } {
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  const endExclusive = `${ny}-${String(nm).padStart(2, '0')}-01`
  return { start, endExclusive }
}

// Timezone-safe "July 2026" label for a "YYYY-MM" string.
// Uses the local Date constructor (not string parsing) so it never shifts a day.
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Normalize common CSV date formats (YYYY-MM-DD, MM-DD-YYYY, MM/DD/YYYY, or
// anything Date can parse) to PocketBase's "YYYY-MM-DD 00:00:00.000Z" so imported
// transactions are filterable by month.
export function normalizeDate(input: string): string {
  const s = String(input || '').trim()
  let iso: string
  let m: RegExpMatchArray | null
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  } else if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/))) {
    iso = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  } else {
    const d = new Date(s)
    iso = isNaN(d.getTime())
      ? new Date().toISOString().slice(0, 10)
      : d.toISOString().slice(0, 10)
  }
  return `${iso} 00:00:00.000Z`
}

// Timezone-safe short date ("Aug 14") from a YYYY-MM-DD string.
export function formatShortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Shift a "YYYY-MM" string by delta months, timezone-safe.
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
