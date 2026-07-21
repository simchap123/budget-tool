import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { formatDate } from '../../utils/dateRange'
import { txAmount } from '../../utils/reportStats'

// A presentational drill-down: renders a preloaded list of transactions with a
// running net total. Unlike TransactionsModal (which fetches by a server filter)
// this takes an already-filtered array, so the Reports page can drill into any
// group — including vendor and budget — using the exact rows it already grouped.
export function TxnListModal({
  title,
  subtitle,
  txns,
  onClose,
}: {
  title: string
  subtitle?: string
  txns: any[]
  onClose: () => void
}) {
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

  const net = txns.reduce((s, t) => s + (t.type === 'income' ? txAmount(t) : -txAmount(t)), 0)

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
          {txns.length === 0 ? (
            <p className="text-ink-400">No transactions.</p>
          ) : (
            <>
              <p className="mb-3 text-body-sm text-ink-400">
                {txns.length} transaction{txns.length === 1 ? '' : 's'} · net{' '}
                <span className={net >= 0 ? 'text-accent-sunset' : 'text-accent-dusk'}>
                  {net >= 0 ? '+' : '-'}${Math.abs(net).toFixed(2)}
                </span>
              </p>
              <div>
                {txns.map((t, i) => (
                  <div
                    key={t.id || i}
                    className="flex items-center justify-between gap-3 border-b border-canvas-soft py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body-sm text-ink-200">{t.description || 'Transaction'}</p>
                      <p className="text-body-sm text-ink-500">
                        {formatDate(t.date)} · {t.category || 'Uncategorized'}
                      </p>
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
