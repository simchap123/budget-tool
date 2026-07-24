import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { X, Pencil } from 'lucide-react'
import { formatDate } from '../../utils/dateRange'
import { txAmount } from '../../utils/reportStats'
import { useCategories, invalidateCategories } from '../../hooks/useCategories'
import { propagateCategory } from '../../utils/recategorize'
import { merchantKey } from '../../utils/merchant'
import { QuickCategorySheet } from './QuickCategorySheet'

// A drill-down: renders a preloaded list of transactions with a running net
// total. Unlike TransactionsModal (which fetches by a server filter) this takes
// an already-filtered array, so the Reports page can drill into any group -
// including vendor and budget - using the exact rows it already grouped.
//
// Categories are editable inline: tapping a row's category recategorizes just
// that transaction (optimistic PATCH), keeps a local copy in sync, and calls
// `onChanged` so the parent's report can reflect the edit.
export function TxnListModal({
  title,
  subtitle,
  txns,
  onChanged,
  onClose,
}: {
  title: string
  subtitle?: string
  txns: any[]
  onChanged?: (id: string, category: string) => void
  onClose: () => void
}) {
  // Local copy so an edit reflects immediately even if the parent doesn't wire
  // `onChanged`. Re-sync whenever the parent hands us a fresh list.
  const [items, setItems] = useState<any[]>(txns)
  const [editing, setEditing] = useState<any | null>(null)
  const categories = useCategories()

  useEffect(() => {
    setItems(txns)
  }, [txns])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  // Recategorize a single transaction from inside the drill-down. Optimistic.
  const changeCategory = async (txn: any, cat: string) => {
    setEditing(null)
    setItems((prev) => prev.map((t) => (t.id === txn.id ? { ...t, category: cat } : t)))
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      await axios.patch(
        `${apiUrl}/collections/transactions/records/${txn.id}`,
        { category: cat },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )
      invalidateCategories()
      onChanged?.(txn.id, cat)
      // Offer to apply to this merchant's other transactions.
      const also = await propagateCategory(txn.description, cat)
      if (also > 0) {
        const key = merchantKey(txn.description || '')
        setItems((prev) => prev.map((t) => (merchantKey(t.description || '') === key ? { ...t, category: cat } : t)))
      }
    } catch {
      // Revert on failure.
      setItems((prev) => prev.map((t) => (t.id === txn.id ? { ...t, category: txn.category } : t)))
    }
  }

  const net = items.reduce((s, t) => s + (t.type === 'income' ? txAmount(t) : -txAmount(t)), 0)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pad-safe-b animate-overlay-in sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="card animate-sheet-up sm:animate-scale-in flex w-full max-w-lg max-h-[85dvh] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-normal text-ink-50">{title}</h2>
            {subtitle && <p className="truncate text-body-sm text-ink-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-icon -mr-2 shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto scroll-contain p-4 sm:p-5">
          {items.length === 0 ? (
            <p className="text-ink-400">No transactions.</p>
          ) : (
            <>
              <p className="mb-3 text-body-sm text-ink-400">
                {items.length} transaction{items.length === 1 ? '' : 's'} · net{' '}
                <span className={net >= 0 ? 'text-accent-sunset' : 'text-accent-dusk'}>
                  {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
              <div>
                {items.map((t, i) => (
                  <div
                    key={t.id || i}
                    className="flex items-center justify-between gap-3 border-b border-canvas-soft py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body-sm text-ink-200">{t.description || 'Transaction'}</p>
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
