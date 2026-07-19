import { normalizeDate } from './dateRange'

export interface CsvTransaction {
  amount: number
  description: string
  type: 'income' | 'expense'
  category: string
  note: string
  userId: string
  date: string
}

// Map one parsed CSV row (header cells + value cells) to a transaction, or null
// to skip it: no description, or a zero / non-numeric amount. Header matching is
// case-insensitive and tolerates common bank column names (memo→description).
// Skipping a NaN amount matters — parseFloat of a junk cell would otherwise post
// a "$NaN" transaction.
export function csvRowToTransaction(
  headers: string[],
  values: string[],
  userId: string
): CsvTransaction | null {
  const row: Record<string, string> = {}
  headers.forEach((h, i) => {
    row[String(h).trim().toLowerCase()] = String(values[i] ?? '').trim()
  })

  const description = row.description || row.memo || ''
  const amount = parseFloat(row.amount || '0')
  if (!description || !Number.isFinite(amount) || amount === 0) return null

  const type = (row.type || 'expense').toLowerCase()
  return {
    amount: Math.abs(amount),
    description,
    type: type === 'income' || type === 'in' ? 'income' : 'expense',
    category: row.category || 'Uncategorized',
    note: row.note || '',
    userId,
    date: normalizeDate(row.date || ''),
  }
}
