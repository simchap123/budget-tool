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
