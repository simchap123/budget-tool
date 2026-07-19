import { useState } from 'react'
import axios from 'axios'
import { Wand2 } from 'lucide-react'
import { useToast } from './ui/Toast'
import { fetchAllRecords } from '../utils/fetchAll'

// Find every transaction whose description contains a term (across all history)
// and recategorize them in one confirmed action — for cleaning up big buckets
// like a catch-all "Random" category. The user always sees the exact count and a
// breakdown before anything changes.
export function BulkRecategorize({ categories, onDone }: { categories: string[]; onDone: () => void }) {
  const toast = useToast()
  const [term, setTerm] = useState('')
  const [target, setTarget] = useState('')
  const [matches, setMatches] = useState<any[] | null>(null)
  const [busy, setBusy] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const auth = () => JSON.parse(localStorage.getItem('pb_auth') || '{}')
  const headers = () => ({ Authorization: `Bearer ${auth().token}` })

  const search = async () => {
    const q = term.trim().replace(/["'\\]/g, '')
    if (!q) return
    setBusy(true)
    setMatches(null)
    try {
      const filter = encodeURIComponent(`(userId='${auth().record.id}' && description ~ "${q}")`)
      const items = await fetchAllRecords(apiUrl, 'transactions', `filter=${filter}&sort=-date`, headers())
      setMatches(items)
    } catch {
      toast.error('Search failed')
    } finally {
      setBusy(false)
    }
  }

  const breakdown = () => {
    const by: Record<string, number> = {}
    ;(matches || []).forEach((m) => {
      const c = m.category || 'Uncategorized'
      by[c] = (by[c] || 0) + 1
    })
    return Object.entries(by).sort((a, b) => b[1] - a[1])
  }

  const apply = async () => {
    if (!matches?.length || !target.trim()) return
    if (!window.confirm(`Recategorize ${matches.length} transaction(s) matching "${term.trim()}" to "${target.trim()}"? This can't be undone in bulk.`)) return
    setBusy(true)
    try {
      // One server-side pass — fast and reliable even for hundreds of rows.
      const { data } = await axios.post(
        `${apiUrl}/rpc/bulk-recategorize`,
        { term: term.trim(), category: target.trim() },
        { headers: headers() }
      )
      toast.success(`Recategorized ${data.updated} transaction(s) to "${target.trim()}"`)
      setMatches(null)
      setTerm('')
      onDone()
    } catch (e: any) {
      toast.error('Recategorize failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Wand2 size={18} className="text-accent-twilight" />
        <h3 className="text-lg font-normal text-ink-50">Bulk recategorize</h3>
      </div>
      <p className="text-body-sm text-ink-400 mb-4">
        Clean up a big bucket fast: find every transaction matching a merchant/keyword and move them all to one category.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-body-sm text-ink-400 mb-1">Description contains</label>
          <input
            value={term}
            onChange={(e) => { setTerm(e.target.value); setMatches(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') search() }}
            placeholder="e.g. AMAZON"
            aria-label="Search term"
            className="input-base w-full"
          />
        </div>
        <button onClick={search} disabled={busy || !term.trim()} className="btn-secondary py-2 px-4 disabled:opacity-50">
          {busy && matches === null ? 'Searching…' : 'Find'}
        </button>
      </div>

      {matches !== null && (
        <div className="mt-4">
          {matches.length === 0 ? (
            <p className="text-body-sm text-ink-400">No transactions match &ldquo;{term.trim()}&rdquo;.</p>
          ) : (
            <>
              <p className="text-body-sm text-ink-200">
                <span className="text-accent-twilight font-medium">{matches.length}</span> match — currently:{' '}
                {breakdown().slice(0, 5).map(([c, n], i) => (
                  <span key={c} className="text-ink-400">{i > 0 ? ', ' : ''}{n} {c}</span>
                ))}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem]">
                  <label className="block text-body-sm text-ink-400 mb-1">Move all to</label>
                  <input
                    list="recat-cats" value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Category"
                    aria-label="Target category"
                    className="input-base w-full"
                  />
                  <datalist id="recat-cats">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <button onClick={apply} disabled={busy || !target.trim()} className="btn-primary py-2 px-4 disabled:opacity-50">
                  {busy ? 'Applying…' : `Recategorize ${matches.length}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
