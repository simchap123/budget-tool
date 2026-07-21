// Turns the current Reports view into a set of spreadsheet-ready sheets. Pure
// and framework-free so the export layout is unit-testable; the actual .xlsx
// bytes are produced by utils/xlsx.ts.
import { XlsxSheet } from './xlsx'
import { ReportRow } from './reportEngine'
import { txAmount } from './reportStats'
import { formatDate } from './dateRange'

const MONEY = '$#,##0.00'

export interface ReportExportInput {
  groupLabel: string // e.g. "Category"
  valueLabel: string // e.g. "Spending"
  rangeLabel: string // e.g. "Jul 2026"
  rows: ReportRow[]
  total: number
  years: number // fractional years in range, for avg/year
  months: number // calendar months in range, for avg/month
  showAvgPerYear: boolean // per-bucket averages only meaningful for category / vendor
  txns: any[]
  totals: { income: number; expense: number; net: number; savingsRate: number; count: number }
}

// Breakdown + Summary + Transactions sheets for a grouped (non-budget) report.
export function buildReportSheets(input: ReportExportInput): XlsxSheet[] {
  const { groupLabel, valueLabel, rangeLabel, rows, total, years, months, showAvgPerYear, txns, totals } = input

  const summary: XlsxSheet = {
    name: 'Summary',
    columns: [
      { header: 'Field', key: 'field', width: 22 },
      { header: 'Value', key: 'value', width: 28 },
    ],
    rows: [
      { field: 'Report', value: `${valueLabel} by ${groupLabel.toLowerCase()}` },
      { field: 'Date range', value: rangeLabel },
      { field: 'Income', value: totals.income },
      { field: 'Expenses', value: totals.expense },
      { field: 'Net', value: totals.net },
      { field: 'Savings rate', value: `${totals.savingsRate.toFixed(1)}%` },
      { field: 'Transactions', value: totals.count },
    ],
  }

  const breakdownColumns = [
    { header: groupLabel, key: 'label', width: 24 },
    { header: 'Transactions', key: 'count', width: 14 },
    { header: valueLabel, key: 'value', width: 16, numFmt: MONEY },
    { header: '% of total', key: 'pct', width: 12 },
  ]
  if (showAvgPerYear) {
    breakdownColumns.push({ header: 'Avg / month', key: 'avgPerMonth', width: 16, numFmt: MONEY })
    breakdownColumns.push({ header: 'Avg / year', key: 'avgPerYear', width: 16, numFmt: MONEY })
  }

  const breakdown: XlsxSheet = {
    name: `${valueLabel} by ${groupLabel}`,
    columns: breakdownColumns,
    rows: rows.map((r) => {
      const row: Record<string, unknown> = {
        label: r.label,
        count: r.count,
        value: round2(r.value),
        pct: total !== 0 ? `${Math.round((Math.abs(r.value) / Math.abs(total)) * 100)}%` : '—',
      }
      if (showAvgPerYear) {
        row.avgPerMonth = round2(r.value / months)
        row.avgPerYear = round2(r.value / years)
      }
      return row
    }),
  }

  return [summary, breakdown, transactionsSheet(txns)]
}

// Budget-vs-actual export: a variance sheet plus the underlying transactions.
export function buildBudgetSheets(
  rangeLabel: string,
  rows: { category: string; budget: number; spent: number; remaining: number }[],
  txns: any[]
): XlsxSheet[] {
  const variance: XlsxSheet = {
    name: 'Budget vs actual',
    columns: [
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Budgeted', key: 'budget', width: 16, numFmt: MONEY },
      { header: 'Spent', key: 'spent', width: 16, numFmt: MONEY },
      { header: 'Remaining', key: 'remaining', width: 16, numFmt: MONEY },
    ],
    rows: rows.map((r) => ({
      category: r.category,
      budget: round2(r.budget),
      spent: round2(r.spent),
      remaining: round2(r.remaining),
    })),
  }
  const summary: XlsxSheet = {
    name: 'Summary',
    columns: [
      { header: 'Field', key: 'field', width: 22 },
      { header: 'Value', key: 'value', width: 28 },
    ],
    rows: [
      { field: 'Report', value: 'Budget vs actual' },
      { field: 'Date range', value: rangeLabel },
      { field: 'Categories', value: rows.length },
    ],
  }
  return [summary, variance, transactionsSheet(txns)]
}

// Shared transaction detail sheet, newest first.
export function transactionsSheet(txns: any[]): XlsxSheet {
  return {
    name: 'Transactions',
    columns: [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Description', key: 'description', width: 32 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Amount', key: 'amount', width: 14, numFmt: MONEY },
      { header: 'Note', key: 'note', width: 28 },
    ],
    rows: txns.map((t) => ({
      date: formatDate(t.date),
      description: t.description || '',
      category: t.category || 'Uncategorized',
      type: t.type || '',
      // Signed so a spreadsheet SUM is meaningful: income positive, expense negative.
      amount: round2(t.type === 'income' ? txAmount(t) : -txAmount(t)),
      note: t.note || '',
    })),
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
