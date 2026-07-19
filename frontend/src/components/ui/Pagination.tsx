import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageNumbers } from '../../utils/pagination'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const pages = pageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className="p-2 text-ink-400 hover:text-ink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      {pages.map((p, idx) => (
        <div key={idx}>
          {p === '...' ? (
            <span className="px-2 text-ink-400">...</span>
          ) : (
            <button
              onClick={() => onPageChange(p as number)}
              className={`px-3 py-2 rounded-sm font-normal transition-colors ${
                p === page
                  ? 'bg-accent-sunset text-canvas'
                  : 'text-ink-400 hover:text-ink-200 hover:bg-canvas-soft'
              }`}
            >
              {p}
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
        className="p-2 text-ink-400 hover:text-ink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
