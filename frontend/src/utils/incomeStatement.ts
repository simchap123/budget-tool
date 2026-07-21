// Builds an Income Statement (P&L) matrix from transactions: categories down the
// side, time periods across the top, split into Income and Expense sections with
// totals and a Net line. Two shapes: month-by-month for a single year, or one
// column per year. Pure and tested; the Excel writing lives in utils/xlsx.ts.
import { txAmount } from './reportStats'
import { XlsxSheet } from './xlsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONEY = '$#,##0.00'

interface IsTxn {
  amount: number | string
  type: string
  category?: string
  date?: string
}

export interface StatementRow {
  label: string
  values: number[] // one per column, last column is the row total
}

export interface IncomeStatement {
  columns: string[] // period labels; last entry is the total column
  income: StatementRow[]
  expense: StatementRow[]
  totalIncome: number[]
  totalExpense: number[]
  net: number[]
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// mode 'month' → 12 months of `year` + Full Year total.
// mode 'year'  → one column per year present in the data + a Total column.
export function buildIncomeStatement(txns: IsTxn[], mode: 'month' | 'year', year?: number): IncomeStatement {
  let periodLabels: string[]
  let periodCount: number
  let indexOf: (t: IsTxn) => number // column index for a txn, or -1 to skip

  if (mode === 'month') {
    periodLabels = MONTHS
    periodCount = 12
    const y = String(year ?? new Date().getFullYear())
    indexOf = (t) => {
      const d = String(t.date || '')
      if (d.slice(0, 4) !== y) return -1
      const m = parseInt(d.slice(5, 7), 10)
      return m >= 1 && m <= 12 ? m - 1 : -1
    }
  } else {
    const years = Array.from(new Set(txns.map((t) => String(t.date || '').slice(0, 4)).filter((s) => s.length === 4))).sort()
    periodLabels = years
    periodCount = years.length
    indexOf = (t) => years.indexOf(String(t.date || '').slice(0, 4))
  }

  const totalCol = periodCount // index of the appended total column
  const width = periodCount + 1
  const blank = () => new Array(width).fill(0)

  const incAcc: Record<string, number[]> = {}
  const expAcc: Record<string, number[]> = {}

  for (const t of txns) {
    const i = indexOf(t)
    if (i < 0) continue
    const amt = txAmount(t)
    if (!(amt !== 0)) continue
    const cat = t.category || 'Uncategorized'
    const acc = t.type === 'income' ? incAcc : t.type === 'expense' ? expAcc : null
    if (!acc) continue
    if (!acc[cat]) acc[cat] = blank()
    acc[cat][i] += amt
    acc[cat][totalCol] += amt
  }

  const toRows = (acc: Record<string, number[]>): StatementRow[] =>
    Object.entries(acc)
      .map(([label, values]) => ({ label, values: values.map(round2) }))
      .sort((a, b) => b.values[totalCol] - a.values[totalCol])

  const income = toRows(incAcc)
  const expense = toRows(expAcc)

  const sumRows = (rows: StatementRow[]): number[] => {
    const out = blank()
    for (const r of rows) for (let i = 0; i < width; i++) out[i] += r.values[i]
    return out.map(round2)
  }
  const totalIncome = sumRows(income)
  const totalExpense = sumRows(expense)
  const net = totalIncome.map((v, i) => round2(v - totalExpense[i]))

  return {
    columns: [...periodLabels, mode === 'month' ? 'Full Year' : 'Total'],
    income,
    expense,
    totalIncome,
    totalExpense,
    net,
  }
}

// Render the statement as a single spreadsheet-ready sheet.
export function incomeStatementSheet(is: IncomeStatement, sheetName: string): XlsxSheet {
  const columns = [
    { header: 'Line item', key: 'k', width: 30 },
    ...is.columns.map((c) => ({ header: c, key: c, width: 13, numFmt: MONEY })),
  ]
  const mkRow = (label: string, values: number[]): Record<string, unknown> => {
    const row: Record<string, unknown> = { k: label }
    is.columns.forEach((c, i) => (row[c] = values[i]))
    return row
  }
  const rows: Record<string, unknown>[] = [
    { k: 'INCOME' },
    ...is.income.map((r) => mkRow(r.label, r.values)),
    mkRow('Total Income', is.totalIncome),
    { k: '' },
    { k: 'EXPENSES' },
    ...is.expense.map((r) => mkRow(r.label, r.values)),
    mkRow('Total Expenses', is.totalExpense),
    { k: '' },
    mkRow('Net Income', is.net),
  ]
  return { name: sheetName, columns, rows }
}
