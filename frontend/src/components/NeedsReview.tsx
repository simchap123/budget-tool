import { useState, useEffect } from 'react'
import axios from 'axios'
import { Check, Trash2, Mail } from 'lucide-react'
import { useToast } from './ui/Toast'
import { CategorySelect } from './ui/CategorySelect'
import { useCategories } from '../hooks/useCategories'

interface ReviewTxn {
  id: string
  date: string
  description: string
  amount: number
  type: string
  category: string
}

// Dashboard card listing transactions captured from email that the user hasn't
// confirmed yet. Renders nothing when the queue is empty. Approve keeps the
// transaction (clears the flag); discard deletes it.
export function NeedsReview({ onChange }: { onChange?: () => void }) {
  const toast = useToast()
  const categories = useCategories()
  const [items, setItems] = useState<ReviewTxn[]>([])
  const [loading, setLoading] = useState(true)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  const load = async () => {
    try {
      const filter = encodeURIComponent('needsReview = true')
      const { data } = await axios.get(
        `${apiUrl}/collections/transactions/records?filter=${filter}&sort=-date&perPage=100`,
        { headers: headers() }
      )
      setItems(data.items || [])
    } catch (e) {
      // Field may not exist yet on a stale backend - fail quietly, show nothing.
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (t: ReviewTxn) => {
    setItems((xs) => xs.filter((x) => x.id !== t.id))
    try {
      await axios.patch(`${apiUrl}/collections/transactions/records/${t.id}`, { needsReview: false }, { headers: headers() })
      toast.success('Approved')
      onChange?.()
    } catch (e: any) {
      toast.error('Approve failed: ' + (e?.response?.data?.message || e?.message))
      load()
    }
  }

  const discard = async (t: ReviewTxn) => {
    setItems((xs) => xs.filter((x) => x.id !== t.id))
    try {
      await axios.delete(`${apiUrl}/collections/transactions/records/${t.id}`, { headers: headers() })
      toast.success('Discarded')
      onChange?.()
    } catch (e: any) {
      toast.error('Discard failed: ' + (e?.response?.data?.message || e?.message))
      load()
    }
  }

  const setCategory = async (t: ReviewTxn, category: string) => {
    setItems((xs) => xs.map((x) => (x.id === t.id ? { ...x, category } : x)))
    try {
      await axios.patch(`${apiUrl}/collections/transactions/records/${t.id}`, { category }, { headers: headers() })
    } catch (e: any) {
      toast.error('Category update failed')
    }
  }

  if (loading || items.length === 0) return null

  return (
    <div className="mt-6 card border-accent-sunset/40 bg-accent-sunset/5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Mail size={18} className="text-accent-sunset" />
        <h2 className="text-lg font-normal text-ink-50">Needs review</h2>
        <span className="rounded-full bg-accent-sunset/20 px-2 py-0.5 text-body-sm text-accent-sunset">{items.length}</span>
      </div>
      <p className="mt-1 text-body-sm text-ink-500">Captured from email. Confirm the category, then approve - or discard.</p>

      <div className="mt-4 space-y-2">
        {items.map((t) => (
          <div key={t.id} className="flex flex-col gap-2 rounded-sm border border-ink-700 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate text-ink-100">{t.description}</p>
              <p className="text-body-sm text-ink-500">
                {t.date} · <span className={t.type === 'income' ? 'text-accent-breeze' : 'text-accent-dusk'}>
                  {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            </div>
            <div className="w-full sm:w-44">
              <CategorySelect
                value={t.category}
                onChange={(c) => setCategory(t, c)}
                categories={categories}
                ariaLabel={`Category for ${t.description}`}
                placeholder="Pick a category"
                className="input-base w-full"
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => approve(t)} className="btn-primary px-3" title="Approve" aria-label={`Approve ${t.description}`}>
                <Check size={16} />
              </button>
              <button onClick={() => discard(t)} className="btn-secondary px-3 text-red-400" title="Discard" aria-label={`Discard ${t.description}`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
