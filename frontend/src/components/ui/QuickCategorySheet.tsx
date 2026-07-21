import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Search, X } from 'lucide-react'

// One-tap category reassignment. Deliberately not the full edit form: changing
// what bucket a transaction lands in is the single most common correction, and
// it shouldn't cost a form round-trip.
export function QuickCategorySheet({
  current,
  categories,
  title,
  onPick,
  onClose,
}: {
  current: string
  categories: string[]
  title: string
  onPick: (category: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')

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

  const needle = q.trim().toLowerCase()
  const shown = needle
    ? categories.filter((c) => c.toLowerCase().includes(needle))
    : categories

  // Offer the typed text as a new category when it matches nothing exactly.
  const exact = categories.some((c) => c.toLowerCase() === needle)
  const canCreate = needle.length > 0 && !exact

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Change category"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pad-safe-b animate-overlay-in sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="card animate-sheet-up sm:animate-scale-in flex w-full max-w-sm max-h-[80dvh] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 p-4">
          <div className="min-w-0">
            <h2 className="text-lg font-normal text-ink-50">Category</h2>
            <p className="truncate text-body-sm text-ink-500">{title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-icon -mr-2 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="shrink-0 border-b border-ink-700 p-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search or create…"
              aria-label="Search categories"
              className="input-base pl-9"
            />
          </div>
        </div>

        <div className="overflow-y-auto scroll-contain p-2">
          {canCreate && (
            <button
              onClick={() => onPick(q.trim())}
              className="flex min-h-touch w-full items-center gap-2 rounded-sm px-3 text-left text-accent-sunset transition-colors hover:bg-canvas-soft"
            >
              ➕ Create “{q.trim()}”
            </button>
          )}
          {shown.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className="flex min-h-touch w-full items-center justify-between gap-2 rounded-sm px-3 text-left text-ink-200 transition-colors hover:bg-canvas-soft"
            >
              <span className="truncate">{c}</span>
              {c === current && <Check size={16} className="shrink-0 text-accent-sunset" />}
            </button>
          ))}
          {shown.length === 0 && !canCreate && (
            <p className="p-4 text-center text-body-sm text-ink-500">No categories match.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
