import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, Percent, Download } from 'lucide-react'
import { reportTotals, txAmount } from '../utils/reportStats'
import { fetchAllRecords } from '../utils/fetchAll'
import { groupTransactions, rowMatcher, GroupBy, ValueType } from '../utils/reportEngine'
import { resolveRange, RANGE_OPTIONS, RangePreset, yearsInRange } from '../utils/reportRange'
import { TxnListModal } from '../components/ui/TxnListModal'
import { downloadXlsx } from '../utils/xlsx'
import { buildReportSheets, buildBudgetSheets } from '../utils/reportExport'
import { IncomeStatementModal } from '../components/ui/IncomeStatementModal'
import { useToast } from '../components/ui/Toast'

type Grouping = GroupBy | 'budget'

const GROUP_OPTIONS: { value: Grouping; label: string }[] = [
  { value: 'category', label: 'Category' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'budget', label: 'Budget vs actual' },
]

const VALUE_OPTIONS: { value: ValueType; label: string }[] = [
  { value: 'expense', label: 'Spending' },
  { value: 'income', label: 'Income' },
  { value: 'net', label: 'Net' },
  { value: 'mixed', label: 'Mixed (all)' },
]

const COLORS = ['#f97316', '#06b6d4', '#10b981', '#eab308', '#a855f7', '#ec4899', '#3b82f6', '#f59e0b', '#84cc16', '#14b8a6', '#f43f5e', '#8b5cf6']
const CHART_LIMIT = 12

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// How many calendar months a range covers — used to scale monthly budgets (which
// carry forward) up to the selected window for a fair budget-vs-actual compare.
function monthsInRange(start: string, endExclusive: string, txns: any[]): number {
  if (start && endExclusive) {
    const [sy, sm] = start.split('-').map(Number)
    const [ey, em, ed] = endExclusive.split('-').map(Number)
    const last = new Date(ey, em - 1, ed - 1) // last included day
    const months = last.getFullYear() * 12 + last.getMonth() - (sy * 12 + (sm - 1)) + 1
    return Math.max(1, months)
  }
  // Unbounded (all-time): count distinct months that actually have transactions.
  const set = new Set(txns.map((t) => String(t.date || '').slice(0, 7)).filter((x) => x.length === 7))
  return Math.max(1, set.size)
}

export function Reports() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [budgets, setBudgets] = useState<{ category: string; budgetAmount: number }[]>([])
  const [loading, setLoading] = useState(true)

  const [groupBy, setGroupBy] = useState<Grouping>('category')
  const [valueType, setValueType] = useState<ValueType>('expense')
  const [preset, setPreset] = useState<RangePreset>('this-month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [drill, setDrill] = useState<{ title: string; subtitle: string; txns: any[] } | null>(null)
  const [statement, setStatement] = useState<{ mode: 'month' | 'year'; year: number; txns: any[] } | null>(null)
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const range = useMemo(
    () => resolveRange(preset, new Date(), customStart, customEnd),
    [preset, customStart, customEnd]
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
        const apiUrl = import.meta.env.VITE_API_URL || '/api'
        const headers = { Authorization: `Bearer ${auth.token}` }

        const query =
          range.start && range.endExclusive
            ? `filter=${encodeURIComponent(`(date>='${range.start}'&&date<'${range.endExclusive}')`)}&sort=-date`
            : `sort=-date`
        const items = await fetchAllRecords(apiUrl, 'transactions', query, headers)
        setTransactions(items)
      } catch (err) {
        console.error('Error loading report data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [range.start, range.endExclusive])

  // Budgets are range-independent (one per category, carrying forward), so load once.
  useEffect(() => {
    const load = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
        const apiUrl = import.meta.env.VITE_API_URL || '/api'
        const items = await fetchAllRecords(apiUrl, 'budgets', 'perPage=500', { Authorization: `Bearer ${auth.token}` })
        // Dedup by category, keeping the most recent (mirrors the Budget page).
        const byCat: Record<string, any> = {}
        for (const b of items) {
          const key = (b.category || 'Uncategorized').toLowerCase()
          if (!byCat[key] || String(b.created || '') > String(byCat[key].created || '')) byCat[key] = b
        }
        setBudgets(Object.values(byCat).map((b: any) => ({ category: b.category || 'Uncategorized', budgetAmount: Number(b.budgetAmount) || 0 })))
      } catch {
        /* budgets are optional */
      }
    }
    load()
  }, [])

  const totals = reportTotals(transactions)
  const isBudget = groupBy === 'budget'

  const grouped = useMemo(
    () => (isBudget ? { rows: [], total: 0 } : groupTransactions(transactions, groupBy as GroupBy, valueType)),
    [transactions, groupBy, valueType, isBudget]
  )

  // Budget-vs-actual rows: budgeted (scaled to the range) vs spent, per category.
  const budgetRows = useMemo(() => {
    if (!isBudget) return []
    const months = monthsInRange(range.start, range.endExclusive, transactions)
    const spentByCat: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      const c = t.category || 'Uncategorized'
      spentByCat[c] = (spentByCat[c] || 0) + txAmount(t)
    }
    return budgets
      .map((b) => {
        const budget = b.budgetAmount * months
        const spent = spentByCat[b.category] || 0
        return { category: b.category, budget, spent, remaining: budget - spent }
      })
      .sort((a, b) => b.spent - a.spent)
  }, [isBudget, budgets, transactions, range.start, range.endExclusive])

  const rangeMonths = monthsInRange(range.start, range.endExclusive, transactions)
  // Fractional years the range spans, used to annualize each row into an
  // "average per year" figure. Only shown for category/vendor, where a
  // per-bucket annual average is meaningful.
  const years = useMemo(
    () => yearsInRange(range.start, range.endExclusive, transactions.map((t) => t.date)),
    [range.start, range.endExclusive, transactions]
  )
  const showAvgPerYear = groupBy === 'category' || groupBy === 'vendor'

  const handleExport = async () => {
    setExporting(true)
    try {
      const valueLabel = VALUE_OPTIONS.find((v) => v.value === valueType)?.label || 'Spending'
      const groupLabel = GROUP_OPTIONS.find((g) => g.value === groupBy)?.label || 'Category'
      const sheets = isBudget
        ? buildBudgetSheets(range.label, budgetRows, transactions)
        : buildReportSheets({
            groupLabel,
            valueLabel,
            rangeLabel: range.label,
            rows: grouped.rows,
            total: grouped.total,
            years,
            months: rangeMonths,
            showAvgPerYear,
            txns: transactions,
            totals,
          })
      // Filename-safe (not sheet-name-safe — no 31-char cap): collapse the
      // range label's spaces and en-dash into single hyphens.
      const name = `report-${groupBy}-${range.label}`
        .replace(/[–—]/g, '-')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      await downloadXlsx(sheets, `${name}.xlsx`)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Could not generate the Excel file')
    } finally {
      setExporting(false)
    }
  }

  // Income Statement (P&L): open the on-screen, drillable viewer (with its own
  // Excel export). Pulls the full history so the statement is complete.
  const openStatement = async (mode: 'month' | 'year') => {
    setExporting(true)
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const all = await fetchAllRecords(apiUrl, 'transactions', 'sort=date', { Authorization: `Bearer ${auth.token}` })
      const year = range.start ? parseInt(range.start.slice(0, 4), 10) : new Date().getFullYear()
      setStatement({ mode, year, txns: all })
    } catch (err) {
      console.error('Statement load failed:', err)
      toast.error('Could not load the income statement')
    } finally {
      setExporting(false)
    }
  }

  // Bars are horizontal for category/vendor (long labels) and vertical for the
  // month/year time series.
  const horizontal = groupBy === 'category' || groupBy === 'vendor'
  const chartRows = grouped.rows.slice(0, CHART_LIMIT).map((r) => ({ ...r, value: Math.abs(r.value) }))

  // Filter the loaded rows down to one group for drill-down, respecting the
  // active value-type so an "Income" report drills into income transactions.
  const txnsForRow = (gb: GroupBy, key: string) => {
    const match = rowMatcher(gb, key)
    return transactions.filter((t) => {
      if (!match(t)) return false
      if (valueType === 'expense') return t.type === 'expense'
      if (valueType === 'income') return t.type === 'income'
      return true
    })
  }

  const openRowDrill = (gb: GroupBy, key: string, label: string) => {
    setDrill({ title: label, subtitle: `${range.label} · transactions`, txns: txnsForRow(gb, key) })
  }

  // A category edit inside the drill-down should flow back into the loaded rows
  // so the chart and table re-group immediately (the modal keeps its own copy in
  // sync too). Update the drill snapshot as well so it stays consistent if reused.
  const handleTxnChanged = (id: string, category: string) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)))
    setDrill((prev) =>
      prev ? { ...prev, txns: prev.txns.map((t) => (t.id === id ? { ...t, category } : t)) } : prev
    )
  }

  const openBudgetDrill = (category: string) => {
    const txns = transactions.filter((t) => t.type === 'expense' && (t.category || 'Uncategorized') === category)
    setDrill({ title: category, subtitle: `${range.label} · spending`, txns })
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display-lg">Reports</h1>
          <p className="mt-2 text-ink-400">Break your money down any way you like</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <button
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
            className="btn-secondary px-4"
            title="Download the current report as an Excel workbook"
          >
            <Download size={16} className="mr-2" />
            {exporting ? 'Preparing…' : 'Export report'}
          </button>
          <button
            onClick={() => openStatement('month')}
            disabled={exporting}
            className="btn-secondary px-4"
            title="Income statement: categories by month for the selected year — view then export"
          >
            P&amp;L · monthly
          </button>
          <button
            onClick={() => openStatement('year')}
            disabled={exporting}
            className="btn-secondary px-4"
            title="Income statement: categories by year — view then export"
          >
            <Download size={16} className="mr-2" /> P&amp;L · yearly
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-body-sm text-ink-400">Group by</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as Grouping)} className="input-base" aria-label="Group by">
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-body-sm text-ink-400">Show</span>
          <select
            value={valueType}
            onChange={(e) => setValueType(e.target.value as ValueType)}
            disabled={isBudget}
            className="input-base disabled:opacity-50"
            aria-label="Value type"
          >
            {VALUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-body-sm text-ink-400">Date range</span>
          <select value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)} className="input-base" aria-label="Date range">
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-body-sm text-ink-400">From</span>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-base" aria-label="Start date" />
            </label>
            <label className="block">
              <span className="mb-1 block text-body-sm text-ink-400">To</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-base" aria-label="End date" />
            </label>
          </div>
        )}
      </div>

      <p className="mt-3 text-body-sm text-ink-500">
        Showing <span className="text-ink-300">{range.label}</span>
        {isBudget && rangeMonths > 1 && <> · budgets scaled ×{rangeMonths} months</>}
      </p>

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-accent-sunset" />
            <p className="text-body-sm text-ink-400">Income</p>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-sunset">{money(totals.income)}</p>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <TrendingDown size={20} className="text-accent-dusk" />
            <p className="text-body-sm text-ink-400">Expenses</p>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-dusk">{money(totals.expense)}</p>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-accent-breeze" />
            <p className="text-body-sm text-ink-400">Net</p>
          </div>
          <p className={`mt-2 text-2xl sm:text-3xl font-normal ${totals.net >= 0 ? 'text-accent-breeze' : 'text-red-400'}`}>{money(totals.net)}</p>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Percent size={20} className="text-accent-twilight" />
            <p className="text-body-sm text-ink-400">Savings rate</p>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-twilight">{totals.savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 card p-12 text-center text-ink-400">Loading…</div>
      ) : transactions.length === 0 ? (
        <div className="mt-12 card p-12 text-center text-ink-400">No transactions in this range.</div>
      ) : isBudget ? (
        <BudgetView rows={budgetRows} onDrill={openBudgetDrill} />
      ) : (
        <>
          {/* Chart */}
          <div className="mt-10 card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-normal text-ink-50">
              {VALUE_OPTIONS.find((v) => v.value === valueType)?.label} by {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label.toLowerCase()}
            </h2>
            {chartRows.length === 0 ? (
              <p className="py-12 text-center text-ink-400">Nothing to show for this selection.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, horizontal ? chartRows.length * 34 + 40 : 320)}>
                {horizontal ? (
                  <BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" horizontal={false} />
                    <XAxis type="number" stroke="#888" style={{ fontSize: '12px' }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="label" stroke="#888" style={{ fontSize: '12px' }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '4px' }} labelStyle={{ color: '#d4d4d4' }} formatter={(v: number) => money(v)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openRowDrill(groupBy as GroupBy, d.key, d.label)}>
                      {chartRows.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart data={chartRows} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" />
                    <XAxis dataKey="label" stroke="#888" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#888" style={{ fontSize: '12px' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '4px' }} labelStyle={{ color: '#d4d4d4' }} formatter={(v: number) => money(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => openRowDrill(groupBy as GroupBy, d.key, d.label)}>
                      {chartRows.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
            {grouped.rows.length > CHART_LIMIT && (
              <p className="mt-3 text-body-sm text-ink-500">Chart shows the top {CHART_LIMIT} of {grouped.rows.length} — the full list is in the table below.</p>
            )}
          </div>

          {/* Table */}
          <div className="mt-8">
            <div className="table-scroll">
              <table className="table-minimal">
                <thead>
                  <tr>
                    <th>{GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</th>
                    <th className="text-right">Transactions</th>
                    <th className="text-right">{VALUE_OPTIONS.find((v) => v.value === valueType)?.label}</th>
                    {showAvgPerYear && <th className="text-right">Avg / month</th>}
                    {showAvgPerYear && <th className="text-right">Avg / year</th>}
                    <th className="text-right">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.rows.map((r) => (
                    <tr key={r.key}>
                      <td>
                        <button
                          type="button"
                          onClick={() => openRowDrill(groupBy as GroupBy, r.key, r.label)}
                          className="text-left text-ink-200 underline decoration-dotted decoration-ink-600 underline-offset-4 hover:text-ink-50"
                          title="See transactions"
                        >
                          {r.label}
                        </button>
                      </td>
                      <td className="text-right text-ink-400">{r.count}</td>
                      <td className={`text-right font-medium ${r.value >= 0 ? 'text-ink-100' : 'text-accent-dusk'}`}>{money(r.value)}</td>
                      {showAvgPerYear && <td className="text-right text-ink-300">{money(r.value / rangeMonths)}</td>}
                      {showAvgPerYear && <td className="text-right text-ink-300">{money(r.value / years)}</td>}
                      <td className="text-right text-ink-500">
                        {grouped.total !== 0 ? `${Math.round((Math.abs(r.value) / Math.abs(grouped.total)) * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {drill && (
        <TxnListModal title={drill.title} subtitle={drill.subtitle} txns={drill.txns} onChanged={handleTxnChanged} onClose={() => setDrill(null)} />
      )}

      {statement && (
        <IncomeStatementModal mode={statement.mode} year={statement.year} txns={statement.txns} onClose={() => setStatement(null)} />
      )}
    </div>
  )
}

// Budget-vs-actual: paired budgeted/spent bars plus a variance table.
function BudgetView({
  rows,
  onDrill,
}: {
  rows: { category: string; budget: number; spent: number; remaining: number }[]
  onDrill: (category: string) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-12 card p-12 text-center text-ink-400">
        No budgets set yet. Add budgets on the Budget page to compare them against actual spending here.
      </div>
    )
  }
  const chart = rows.slice(0, CHART_LIMIT)
  return (
    <>
      <div className="mt-10 card p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-normal text-ink-50">Budget vs actual</h2>
        <ResponsiveContainer width="100%" height={Math.max(280, chart.length * 40 + 40)}>
          <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" horizontal={false} />
            <XAxis type="number" stroke="#888" style={{ fontSize: '12px' }} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="category" stroke="#888" style={{ fontSize: '12px' }} width={100} />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '4px' }} labelStyle={{ color: '#d4d4d4' }} formatter={(v: number) => money(v)} />
            <Legend />
            <Bar dataKey="budget" name="Budgeted" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            <Bar dataKey="spent" name="Spent" fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 table-scroll">
        <table className="table-minimal">
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-right">Budgeted</th>
              <th className="text-right">Spent</th>
              <th className="text-right">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category}>
                <td>
                  <button
                    type="button"
                    onClick={() => onDrill(r.category)}
                    className="text-left text-ink-200 underline decoration-dotted decoration-ink-600 underline-offset-4 hover:text-ink-50"
                    title="See transactions"
                  >
                    {r.category}
                  </button>
                </td>
                <td className="text-right text-ink-400">{money(r.budget)}</td>
                <td className="text-right text-accent-sunset font-medium">{money(r.spent)}</td>
                <td className={`text-right font-medium ${r.remaining >= 0 ? 'text-accent-breeze' : 'text-red-400'}`}>{money(r.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
