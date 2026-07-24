import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { X, Pencil } from 'lucide-react'
import { fetchAllRecords } from '../../utils/fetchAll'
import { formatDate } from '../../utils/dateRange'
import { txAmount } from '../../utils/reportStats'
import { useCategories, invalidateCategories } from '../../hooks/useCategories'
import { propagateCategory } from '../../utils/recategorize'
import { merchantKey } from '../../utils/merchant'
import { QuickCategorySheet } from './QuickCategorySheet'

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
  const [editing, setEditing] = useState<any | null>(null)
  const categories = useCategories()

  // Recategorize a single transaction from inside the drill-down - e.g. a row
  // that's usually Tuition but this one is really something else. Optimistic.
  const changeCategory = async (txn: any, cat: string) => {
    setEditing(null)
    setTxns((prev) => (prev || []).map((t) => (t.id === txn.id ? { ...t, category: cat } : t)))
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      await axios.patch(
        `${apiUrl}/collections/transactions/records/${txn.id}`,
        { category: cat },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )
      invalidateCategories()
      // Offer to apply to the merchant's other transactions; reflect it locally.
      const also = await propagateCategory(txn.description, cat)
      if (also > 0) {
        const key = merchantKey(txn.description || '')
        setTxns((prev) => (prev || []).map((t) => (merchantKey(t.description || '') === key ? { ...t, category: cat } : t)))
      }
    } catch {
      // Revert on failure.
      setTxns((prev) => (prev || []).map((t) => (t.id === txn.id ? { ...t, category: txn.category } : t)))
    }
  }

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
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pad-safe-b animate-overlay-in sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card animate-sheet-up sm:animate-scale-in w-full max-w-lg max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-ink-700 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-normal text-ink-50 truncate">{title}</h2>
            {subtitle && <p className="text-body-sm text-ink-400 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-icon shrink-0 -mr-2">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto scroll-contain">
          {txns === null ? (
            <p className="text-ink-400">Loading…</p>
          ) : txns.length === 0 ? (
            <p className="text-ink-400">No transactions found.</p>
          ) : (
            <>
              <p className="text-body-sm text-ink-400 mb-3">
                {txns.length} transaction{txns.length === 1 ? '' : 's'} · net{' '}
                <span className={net >= 0 ? 'text-accent-sunset' : 'text-accent-dusk'}>
                  {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
              <div>
                {txns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-canvas-soft last:border-0">
                    <div className="min-w-0">
                      <p className="text-body-sm text-ink-200 truncate">{t.description || 'Transaction'}</p>
                      <p className="text-body-sm text-ink-500">
                        {formatDate(t.date)} ·{' '}
                        {/* Tap the category to recategorize just this transaction. */}
                        <button
                          onClick={() => setEditing(t)}
                          className="inline-flex items-center gap-1 rounded px-1 text-ink-400 underline decoration-dotted decoration-ink-600 underline-offset-2 transition-colors hover:text-ink-200"
                          title="Change category"
                        >
                          {t.category || 'Uncategorized'}
                          <Pencil size={11} className="opacity-60" />
                        </button>
                      </p>
                    </div>
                    <span className={`shrink-0 text-body-sm ${t.type === 'income' ? 'text-accent-sunset' : 'text-accent-dusk'}`}>
                      {t.type === 'income' ? '+' : '-'}${txAmount(t).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {editing && (
        <QuickCategorySheet
          current={editing.category || 'Uncategorized'}
          categories={categories}
          title={editing.description || 'Transaction'}
          onPick={(c) => changeCategory(editing, c)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>,
    document.body
  )
}
