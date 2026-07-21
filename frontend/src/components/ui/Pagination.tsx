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
    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mt-8">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className="btn-icon"
      >
        <ChevronLeft size={20} />
      </button>

      {pages.map((p, idx) =>
        p === '...' ? (
          <span key={idx} className="px-1 text-ink-400">
            ...
          </span>
        ) : (
          <button
            key={idx}
            onClick={() => onPageChange(p as number)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={`min-h-touch min-w-touch rounded-sm px-3 font-normal transition-colors ${
              p === page
                ? 'bg-accent-sunset text-canvas'
                : 'text-ink-400 hover:text-ink-200 hover:bg-canvas-soft'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
        className="btn-icon"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
