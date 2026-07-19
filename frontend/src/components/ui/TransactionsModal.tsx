import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { fetchAllRecords } from '../../utils/fetchAll'
import { formatDate } from '../../utils/dateRange'
import { txAmount } from '../../utils/reportStats'

// A drill-down: pass a category / type / date window and it lists exactly those
// transactions (all of them, paginated), with a running net total. Used to make
// categories, budgets, and the giving goal clickable.
export function TransactionsModal({
  title,
  subtitle,
  category,
  type,
  since,
  until,
  onClose,
}: {
  title: string
  subtitle?: string
  category?: string
  type?: 'income' | 'expense'
  since?: string // YYYY-MM-DD inclusive
  until?: string // YYYY-MM-DD exclusive
  onClose: () => void
}) {
  const [txns, setTxns] = useState<any[] | null>(null)

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    const uid = auth.record?.id
    const parts = [`userId='${uid}'`]
    if (category) parts.push(`category='${String(category).replace(/'/g, '')}'`)
    if (type) parts.push(`type='${type}'`)
    if (since) parts.push(`date>='${since}'`)
    if (until) parts.push(`date<'${until}'`)
    const filter = '(' + parts.join(' && ') + ')'
    fetchAllRecords(apiUrl, 'transactions', `filter=${encodeURIComponent(filter)}&sort=-date`, {
      Authorization: `Bearer ${auth.token}`,
    })
      .then(setTxns)
      .catch(() => setTxns([]))

    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = 'unset'
    }
  }, [category, type, since, until, onClose])

  const net = (txns || []).reduce((s, t) => s + (t.type === 'income' ? txAmount(t) : -txAmount(t)), 0)

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card max-w-lg w-full max-h-[85vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-ink-700 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-normal text-ink-50 truncate">{title}</h2>
            {subtitle && <p className="text-body-sm text-ink-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 text-ink-400 hover:text-ink-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {txns === null ? (
            <p className="text-ink-400">Loading…</p>
          ) : txns.length === 0 ? (
            <p className="text-ink-400">No transactions found.</p>
          ) : (
            <>
              <p className="text-body-sm text-ink-400 mb-3">
                {txns.length} transaction{txns.length === 1 ? '' : 's'} · net{' '}
                <span className={net >= 0 ? 'text-accent-sunset' : 'text-accent-dusk'}>
                  {net >= 0 ? '+' : '-'}${Math.abs(net).toFixed(2)}
                </span>
              </p>
              <div>
                {txns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-canvas-soft last:border-0">
                    <div className="min-w-0">
                      <p className="text-body-sm text-ink-200 truncate">{t.description || 'Transaction'}</p>
                      <p className="text-body-sm text-ink-500">{formatDate(t.date)} · {t.category || 'Uncategorized'}</p>
                    </div>
                    <span className={`shrink-0 text-body-sm ${t.type === 'income' ? 'text-accent-sunset' : 'text-accent-dusk'}`}>
                      {t.type === 'income' ? '+' : '-'}${txAmount(t).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
