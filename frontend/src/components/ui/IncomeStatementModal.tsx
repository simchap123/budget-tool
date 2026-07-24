import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'
import { buildIncomeStatement, incomeStatementSheet } from '../../utils/incomeStatement'
import { downloadXlsx } from '../../utils/xlsx'
import { TransactionsModal } from './TransactionsModal'

const money = (n: number) => (n === 0 ? '-' : `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)

// On-screen, clickable Income Statement (P&L). Categories down the side, periods
// across the top, Income/Expense sections + Net. Every category cell drills into
// the exact transactions behind it. Export to Excel from the header.
export function IncomeStatementModal({
  mode,
  year,
  txns,
  onClose,
}: {
  mode: 'month' | 'year'
  year: number
  txns: any[]
  onClose: () => void
}) {
  const is = useMemo(() => buildIncomeStatement(txns, mode, year), [txns, mode, year])
  const [drill, setDrill] = useState<{ category: string; type: 'income' | 'expense'; since: string; until: string; label: string } | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') (drill ? setDrill(null) : onClose()) }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = 'unset' }
  }, [onClose, drill])

  // The [since, until) window a column represents, for drill-down.
  const colRange = (col: number): { since: string; until: string } => {
    const cols = is.columns
    if (mode === 'month') {
      if (col < 12) {
        const mm = String(col + 1).padStart(2, '0')
        const until = col === 11 ? `${year + 1}-01-01` : `${year}-${String(col + 2).padStart(2, '0')}-01`
        return { since: `${year}-${mm}-01`, until }
      }
      return { since: `${year}-01-01`, until: `${year + 1}-01-01` } // Full Year
    }
    // year mode: columns are year strings, last is 'Total'
    if (col < cols.length - 1) {
      const y = cols[col]
      return { since: `${y}-01-01`, until: `${Number(y) + 1}-01-01` }
    }
    const firstY = cols[0]
    const lastY = cols[cols.length - 2]
    return { since: `${firstY}-01-01`, until: `${Number(lastY) + 1}-01-01` }
  }

  const openCell = (category: string, type: 'income' | 'expense', col: number, colLabel: string) => {
    const { since, until } = colRange(col)
    setDrill({ category, type, since, until, label: `${category} · ${colLabel}` })
  }

  const exportXlsx = async () => {
    const sheetName = mode === 'month' ? `Income Statement ${year}` : 'Income Statement by year'
    const file = mode === 'month' ? `income-statement-${year}-monthly.xlsx` : 'income-statement-yearly.xlsx'
    await downloadXlsx([incomeStatementSheet(is, sheetName)], file)
  }

  // A data row: category label + a clickable cell per column.
  const DataRow = ({ label, values, type, clickable }: { label: string; values: number[]; type: 'income' | 'expense'; clickable: boolean }) => (
    <tr className="border-b border-ink-800 hover:bg-canvas-soft/40">
      <td className="sticky left-0 z-10 bg-canvas-card px-3 py-1.5 text-ink-200 whitespace-nowrap">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-1.5 text-right tabular-nums">
          {clickable && v !== 0 ? (
            <button onClick={() => openCell(label, type, i, is.columns[i])} className="text-ink-200 hover:text-accent-sunset hover:underline">
              {money(v)}
            </button>
          ) : (
            <span className="text-ink-400">{money(v)}</span>
          )}
        </td>
      ))}
    </tr>
  )

  const TotalRow = ({ label, values, tone }: { label: string; values: number[]; tone?: string }) => (
    <tr className="border-y-2 border-ink-700 font-medium">
      <td className={`sticky left-0 z-10 bg-canvas-card px-3 py-1.5 whitespace-nowrap ${tone || 'text-ink-50'}`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`px-3 py-1.5 text-right tabular-nums ${tone || 'text-ink-50'}`}>{money(v)}</td>
      ))}
    </tr>
  )

  const SectionRow = ({ label }: { label: string }) => (
    <tr>
      <td colSpan={is.columns.length + 1} className="sticky left-0 bg-canvas-card px-3 pt-3 pb-1 text-body-sm uppercase tracking-wide text-ink-500">{label}</td>
    </tr>
  )

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 animate-overlay-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card animate-sheet-up sm:animate-scale-in flex w-full max-w-[1400px] max-h-[92dvh] flex-col rounded-b-none sm:rounded-sm">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-normal text-ink-50">Income Statement</h2>
            <p className="text-body-sm text-ink-400">{mode === 'month' ? `${year} · by month` : 'by year'} · click any figure to see the transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportXlsx} className="btn-secondary px-3" title="Download as Excel">
              <Download size={16} className="mr-1.5" /> Excel
            </button>
            <button onClick={onClose} aria-label="Close" className="btn-icon shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-auto scroll-contain">
          <table className="min-w-full text-body-sm">
            <thead>
              <tr className="border-b border-ink-700">
                <th className="sticky left-0 z-20 bg-canvas-card px-3 py-2 text-left font-normal text-ink-300">Line item</th>
                {is.columns.map((c) => (
                  <th key={c} className="px-3 py-2 text-right font-normal text-ink-300 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SectionRow label="Income" />
              {is.income.map((r) => <DataRow key={`i-${r.label}`} label={r.label} values={r.values} type="income" clickable />)}
              <TotalRow label="Total Income" values={is.totalIncome} tone="text-accent-sunset" />

              <SectionRow label="Expenses" />
              {is.expense.map((r) => <DataRow key={`e-${r.label}`} label={r.label} values={r.values} type="expense" clickable />)}
              <TotalRow label="Total Expenses" values={is.totalExpense} tone="text-accent-dusk" />

              <TotalRow label="Net Income" values={is.net} tone="text-accent-breeze" />
            </tbody>
          </table>
          {is.income.length === 0 && is.expense.length === 0 && (
            <p className="p-8 text-center text-ink-400">No transactions in this period.</p>
          )}
        </div>
      </div>

      {drill && (
        <TransactionsModal
          title={drill.category}
          subtitle={drill.label}
          category={drill.category}
          type={drill.type}
          since={drill.since}
          until={drill.until}
          onClose={() => setDrill(null)}
        />
      )}
    </div>,
    document.body
  )
}
