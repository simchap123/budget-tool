import { createContext, useContext, useState, ReactNode } from 'react'
import { X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type: ToastType) => void
  error: (message: string) => void
  success: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random()}`
    const newToast: Toast = { id, message, type }

    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const error = (message: string) => toast(message, 'error')
  const success = (message: string) => toast(message, 'success')
  const info = (message: string) => toast(message, 'info')

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast, error, success, info }}>
      {children}

      {/* Toast Stack */}
      {/* Full-width above the home indicator on phones; a corner stack from
          sm up. A 200px-wide toast in a phone corner truncates constantly. */}
      <div className="fixed inset-x-4 bottom-4 z-50 space-y-2 pad-safe-b sm:inset-x-auto sm:right-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in rounded-sm border p-4 text-body-sm flex items-center justify-between gap-3 shadow-lg shadow-black/40 sm:max-w-sm ${
              t.type === 'error'
                ? 'border-red-700 bg-red-500/10 text-red-400'
                : t.type === 'success'
                ? 'border-green-700 bg-green-500/10 text-green-400'
                : 'border-blue-700 bg-blue-500/10 text-blue-400'
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="-my-2 -mr-2 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
