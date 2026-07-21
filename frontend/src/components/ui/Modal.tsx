import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pad-safe-b animate-overlay-in sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* max-h + flex column so a tall body scrolls inside the dialog rather
          than running off the bottom of the phone screen with no way back. */}
      <div className="card animate-sheet-up sm:animate-scale-in w-full max-w-sm max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-ink-700 shrink-0">
          <h2 className="text-lg font-normal text-ink-50 min-w-0">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-icon shrink-0 -mr-2"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto scroll-contain">{children}</div>

        {footer && <div className="border-t border-ink-700 p-4 sm:p-6 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
