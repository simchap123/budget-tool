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

// Parse a money cell, tolerating "$", commas and spaces.
const num = (s: string): number => parseFloat(String(s).replace(/[$,\s]/g, ''))

// Find the index of the column that holds the (signed) amount, so a file-level
// scan can tell whether amounts are signed (a Chase-style export) — in which case
// a negative amount means an expense and a positive one means income.
export function amountColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => /^amount$/i.test(String(h).trim()))
}

export function hasSignedAmounts(headers: string[], rows: string[][]): boolean {
  const idx = amountColumnIndex(headers)
  if (idx < 0) return false
  return rows.some((r) => num(r[idx]) < 0)
}

// A transaction's identity for dedup: same day, amount, description and direction
// is treated as the same transaction. Date is sliced to the day because the store
// keeps a full timestamp ("2026-07-16 00:00:00.000Z") while imports carry "YYYY-MM-DD".
export function txnSignature(t: { date: string; amount: number; description: string; type: string }): string {
  return `${String(t.date).slice(0, 10)}|${Number(t.amount).toFixed(2)}|${String(t.description).trim()}|${t.type}`
}

// Split freshly-parsed rows into the ones NOT already in the account vs. how many
// were duplicates. Uses a COUNT of each signature, not just presence, so a real
// repeat purchase (two identical coffees the same day) still imports the second
// copy when only one is already stored — while re-uploading an overlapping export
// skips exactly the rows already there.
export function dedupeAgainstExisting<T extends { date: string; amount: number; description: string; type: string }>(
  candidates: T[],
  existing: { date: string; amount: number; description: string; type: string }[]
): { fresh: T[]; duplicates: number } {
  const counts = new Map<string, number>()
  for (const e of existing) {
    const s = txnSignature(e)
    counts.set(s, (counts.get(s) || 0) + 1)
  }
  const fresh: T[] = []
  let duplicates = 0
  for (const c of candidates) {
    const s = txnSignature(c)
    const n = counts.get(s) || 0
    if (n > 0) { counts.set(s, n - 1); duplicates++ } else fresh.push(c)
  }
  return { fresh, duplicates }
}

// Map one parsed CSV row to a transaction, or null to skip it (no description, or
// a zero / non-numeric amount). Tolerates the column names real banks use — esp.
// Chase: "Transaction Date"/"Posting Date" for the date, a single signed "Amount",
// or separate "Debit"/"Credit" columns. When `signedAmounts` is true, a negative
// amount is an expense and a positive one is income (Chase signs its amounts).
export function csvRowToTransaction(
  headers: string[],
  values: string[],
  userId: string,
  signedAmounts = false
): CsvTransaction | null {
  const row: Record<string, string> = {}
  headers.forEach((h, i) => {
    row[String(h).trim().toLowerCase()] = String(values[i] ?? '').trim()
  })
  const pick = (...keys: string[]): string => {
    for (const k of keys) if (row[k]) return row[k]
    return ''
  }

  const description = pick('description', 'name', 'memo', 'details', 'payee')
  const dateStr = pick('transaction date', 'trans date', 'posting date', 'post date', 'date')

  let amount: number
  let type: 'income' | 'expense'

  // Some banks split money into separate Debit / Credit columns.
  const debit = num(pick('debit', 'withdrawal', 'withdrawals'))
  const credit = num(pick('credit', 'deposit', 'deposits'))
  if (Number.isFinite(debit) && debit !== 0) {
    amount = Math.abs(debit)
    type = 'expense'
  } else if (Number.isFinite(credit) && credit !== 0) {
    amount = Math.abs(credit)
    type = 'income'
  } else {
    const raw = num(pick('amount'))
    if (!Number.isFinite(raw) || raw === 0) return null
    amount = Math.abs(raw)
    const t = pick('type', 'details', 'transaction type').toLowerCase()
    if (/^(income|in|credit|deposit|refund|return)/.test(t)) type = 'income'
    else if (/^(expense|out|debit|sale|withdrawal|purchase)/.test(t)) type = 'expense'
    else if (signedAmounts) type = raw < 0 ? 'expense' : 'income'
    else type = 'expense'
  }

  if (!description || !Number.isFinite(amount) || amount === 0) return null

  return {
    amount,
    description,
    type,
    category: pick('category') || 'Uncategorized',
    note: pick('note', 'memo'),
    userId,
    date: normalizeDate(dateStr),
  }
}
