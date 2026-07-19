import { txAmount } from './reportStats'

export interface GivingTxn {
  amount: number | string
  type: string
  category?: string
  date?: string
}

export interface GivingMonth {
  month: string // 'YYYY-MM'
  income: number
  target: number // income * percent / 100
  given: number
  remaining: number // target - given (negative = gave more than the target)
}

export interface GivingSummary {
  months: GivingMonth[] // ascending by month
  totalIncome: number
  totalTarget: number
  totalGiven: number
  balance: number // totalGiven - totalTarget (positive = ahead, negative = behind)
}

// Track giving as a percentage of income (e.g. a 10% tithe). For each month:
// income = sum of income transactions, target = percent of income, given = sum of
// EXPENSE transactions in the giving category. Category match is case-insensitive.
// `balance` shows whether cumulative giving is ahead of or behind the target.
export function computeGiving(txns: GivingTxn[], percent: number, category: string): GivingSummary {
  const cat = String(category || '').trim().toLowerCase()
  const byMonth: Record<string, { income: number; given: number }> = {}

  for (const t of txns) {
    const month = String(t.date || '').slice(0, 7)
    if (month.length < 7) continue
    if (!byMonth[month]) byMonth[month] = { income: 0, given: 0 }
    if (t.type === 'income') byMonth[month].income += txAmount(t)
    else if (cat && t.type === 'expense' && String(t.category || '').toLowerCase() === cat) {
      byMonth[month].given += txAmount(t)
    }
  }

  const months = Object.keys(byMonth)
    .sort()
    .map((month) => {
      const { income, given } = byMonth[month]
      const target = income * (percent / 100)
      return { month, income, target, given, remaining: target - given }
    })

  const totalIncome = months.reduce((s, m) => s + m.income, 0)
  const totalTarget = totalIncome * (percent / 100)
  const totalGiven = months.reduce((s, m) => s + m.given, 0)

  return { months, totalIncome, totalTarget, totalGiven, balance: totalGiven - totalTarget }
}
