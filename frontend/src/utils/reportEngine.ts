// Pure aggregation behind the configurable Reports surface. Given a set of
// transactions and a report config, it produces the grouped rows the chart and
// table render. Kept framework-free and side-effect-free so the money math is
// unit-testable and lives in one place.
import { merchantKey } from './merchant'
import { txAmount } from './reportStats'
import { monthLabel } from './dateRange'

export type GroupBy = 'category' | 'vendor' | 'month' | 'year'
export type ValueType = 'expense' | 'income' | 'net' | 'mixed'

export interface ReportTxn {
  id?: string
  amount: number | string
  type: string
  category?: string
  description?: string
  date?: string
}

export interface ReportRow {
  key: string // stable grouping key (used for drill-down + React keys)
  label: string // human label for chart/table
  value: number // signed for 'net', otherwise a positive magnitude
  count: number
}

// Title-case a merchant token like "WHOLEFOODS" / "STARBUCKS" for display.
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// The value a single transaction contributes under a given value-type.
// Non-matching types contribute 0 (e.g. income rows under an "expense" report).
function contribution(t: ReportTxn, type: ValueType): number {
  const amt = txAmount(t)
  if (type === 'income') return t.type === 'income' ? amt : 0
  if (type === 'expense') return t.type === 'expense' ? amt : 0
  // mixed: gross throughput — every income AND expense contributes its magnitude,
  // so a row reflects total money moved regardless of direction.
  if (type === 'mixed') return t.type === 'income' || t.type === 'expense' ? amt : 0
  // net: income positive, expense negative
  if (t.type === 'income') return amt
  if (t.type === 'expense') return -amt
  return 0
}

// Which bucket a transaction falls into for a given grouping, plus its label.
function bucketOf(t: ReportTxn, groupBy: GroupBy): { key: string; label: string } {
  switch (groupBy) {
    case 'category': {
      const c = t.category || 'Uncategorized'
      return { key: c, label: c }
    }
    case 'vendor': {
      const k = merchantKey(t.description || '')
      return { key: k, label: titleCase(k) }
    }
    case 'month': {
      const k = String(t.date || '').slice(0, 7)
      return { key: k, label: k.length === 7 ? monthLabel(k) : 'Unknown' }
    }
    case 'year': {
      const k = String(t.date || '').slice(0, 4)
      return { key: k, label: k || 'Unknown' }
    }
  }
}

export interface GroupResult {
  rows: ReportRow[]
  total: number
}

// Group transactions and return rows plus the range total.
//  - category / vendor: sorted by magnitude, biggest first (top spenders).
//  - month / year: sorted chronologically so the time series reads left→right.
// A transaction that contributes 0 to the chosen value-type is skipped so an
// "expenses" report doesn't list income-only categories with $0 rows.
export function groupTransactions(
  txns: ReportTxn[],
  groupBy: GroupBy,
  type: ValueType
): GroupResult {
  const acc: Record<string, ReportRow> = {}
  let total = 0

  for (const t of txns) {
    const c = contribution(t, type)
    // For net, a transaction always belongs to its bucket even if it nets to 0
    // via other rows; but a strictly-0 contribution (wrong type) is noise.
    if (type !== 'net' && c === 0) continue

    const { key, label } = bucketOf(t, groupBy)
    if (!acc[key]) acc[key] = { key, label, value: 0, count: 0 }
    acc[key].value += c
    acc[key].count += 1
    total += c
  }

  const rows = Object.values(acc)
  if (groupBy === 'month' || groupBy === 'year') {
    rows.sort((a, b) => a.key.localeCompare(b.key))
  } else {
    // Sort by magnitude so the largest buckets lead regardless of sign.
    rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  }

  return { rows, total }
}

// Predicate matching the transactions that make up one report row — used to
// drive drill-down from the exact same grouping logic the chart used, so a
// row's drill-down can never disagree with its displayed total.
export function rowMatcher(groupBy: GroupBy, key: string): (t: ReportTxn) => boolean {
  return (t) => bucketOf(t, groupBy).key === key
}
