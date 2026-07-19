// Pure aggregations behind the Reports page. Kept out of the component so the
// money math is testable and the amount-parsing lives in exactly one place.

export interface ReportTxn {
  amount: number | string
  type: string
  category?: string
  date?: string
}

// Transaction amounts can arrive as strings (from the API/CSV) or numbers.
// Normalize to a finite number so a bad value can never poison a sum into NaN.
export function txAmount(t: { amount: number | string }): number {
  const n = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
  return Number.isFinite(n) ? n : 0
}

export function reportTotals(txns: ReportTxn[]) {
  let income = 0
  let expense = 0
  for (const t of txns) {
    if (t.type === 'income') income += txAmount(t)
    else if (t.type === 'expense') expense += txAmount(t)
  }
  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    count: txns.length,
  }
}

export interface CategoryStat {
  name: string
  income: number
  expense: number
  count: number
  net: number
}

export function categoryBreakdown(txns: ReportTxn[]): CategoryStat[] {
  const stats: Record<string, { income: number; expense: number; count: number }> = {}
  for (const t of txns) {
    const cat = t.category || 'Uncategorized'
    if (!stats[cat]) stats[cat] = { income: 0, expense: 0, count: 0 }
    const amt = txAmount(t)
    if (t.type === 'income') stats[cat].income += amt
    else stats[cat].expense += amt
    stats[cat].count += 1
  }
  return Object.entries(stats).map(([name, data]) => ({ name, ...data, net: data.income - data.expense }))
}

export interface TrendPoint {
  month: string
  income: number
  expense: number
  net: number
}

export function monthlyTrend(txns: ReportTxn[]): TrendPoint[] {
  const byMonth: Record<string, { income: number; expense: number }> = {}
  for (const t of txns) {
    // Group by the stored calendar date's 'YYYY-MM'. Slicing the string avoids
    // new Date(), which parses a UTC-midnight date into the previous day/month
    // in negative-UTC timezones and would misgroup boundary transactions.
    const monthKey = String(t.date || '').slice(0, 7)
    if (monthKey.length < 7) continue
    if (!byMonth[monthKey]) byMonth[monthKey] = { income: 0, expense: 0 }
    const amt = txAmount(t)
    if (t.type === 'income') byMonth[monthKey].income += amt
    else byMonth[monthKey].expense += amt
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, income: data.income, expense: data.expense, net: data.income - data.expense }))
}
