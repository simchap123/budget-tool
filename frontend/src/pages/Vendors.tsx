import { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import { RefreshCw, Pencil } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { CategorySelect } from '../components/ui/CategorySelect'
import { useCategories } from '../hooks/useCategories'
import { fetchAllRecords } from '../utils/fetchAll'

interface Vendor {
  id: string
  name: string
  matchKey: string
  category: string
  count: number
}

const PAGE = 60

// Vendors: the merchant layer. Every transaction rolls up to a vendor (matched on
// the normalized merchant key), and a vendor carries a category - so changing a
// vendor's category re-files every transaction from that merchant at once.
// Rendered as a panel (no page chrome) inside the Categories & Vendors page.
export function VendorsPanel() {
  const toast = useToast()
  const categories = useCategories()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [rebuilding, setRebuilding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [mergeTarget, setMergeTarget] = useState('')
  const [merging, setMerging] = useState(false)
  // Escape cancels the inline rename without the blur handler also saving it.
  const escaped = useRef(false)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const auth = () => JSON.parse(localStorage.getItem('pb_auth') || '{}')
  const headers = () => ({ Authorization: `Bearer ${auth().token}` })

  const load = async () => {
    try {
      setLoading(true)
      const items = await fetchAllRecords(apiUrl, 'vendors', 'sort=-count', headers())
      setVendors(items as Vendor[])
    } catch (e) {
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter((v) => v.name.toLowerCase().includes(q) || v.matchKey.toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q))
  }, [vendors, search])

  const changeCategory = async (v: Vendor, category: string) => {
    if (!category || category === v.category) return
    const prev = v.category
    setVendors((vs) => vs.map((x) => (x.id === v.id ? { ...x, category } : x)))
    try {
      const res = await axios.post(`${apiUrl}/vendors/set-category`, { matchKey: v.matchKey, category }, { headers: headers() })
      toast.success(`${v.name} → ${category} · ${res.data?.updated ?? 0} transaction${res.data?.updated === 1 ? '' : 's'} updated`)
    } catch (e: any) {
      setVendors((vs) => vs.map((x) => (x.id === v.id ? { ...x, category: prev } : x)))
      toast.error('Failed: ' + (e.response?.data?.error || e.message))
    }
  }

  const rename = async (v: Vendor, name: string) => {
    const trimmed = name.trim()
    setEditingId(null)
    if (!trimmed || trimmed === v.name) return
    const prev = v.name
    setVendors((vs) => vs.map((x) => (x.id === v.id ? { ...x, name: trimmed } : x)))
    try {
      await axios.post(`${apiUrl}/vendors/rename`, { matchKey: v.matchKey, name: trimmed }, { headers: headers() })
      toast.success(`Renamed to ${trimmed}`)
    } catch (e: any) {
      setVendors((vs) => vs.map((x) => (x.id === v.id ? { ...x, name: prev } : x)))
      toast.error('Rename failed: ' + (e.response?.data?.error || e.message))
    }
  }

  const selectedVendors = vendors.filter((v) => selected[v.matchKey])

  // Merge every selected vendor into the target (their transactions take the
  // target's category; the source vendor records are removed).
  const runMerge = async (toKey: string) => {
    const froms = selectedVendors.filter((v) => v.matchKey !== toKey)
    if (!toKey || froms.length === 0) return
    setMerging(true)
    try {
      for (const v of froms) {
        await axios.post(`${apiUrl}/rpc/merge-vendor`, { fromKey: v.matchKey, toKey }, { headers: headers() })
      }
      toast.success(`Merged ${froms.length} vendor${froms.length === 1 ? '' : 's'}`)
      setSelected({})
      setMergeTarget('')
      await load()
    } catch (e: any) {
      toast.error('Merge failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setMerging(false)
    }
  }

  const rebuild = async () => {
    setRebuilding(true)
    try {
      const res = await axios.post(`${apiUrl}/vendors/rebuild`, {}, { headers: headers() })
      toast.success(`Rebuilt · ${res.data?.created ?? 0} new, ${res.data?.updated ?? 0} updated`)
      await load()
    } catch (e: any) {
      toast.error('Rebuild failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setRebuilding(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-ink-400">Loading vendors…</div>
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-400">{vendors.length} merchants · set a category once and every transaction from it follows</p>
        <button onClick={rebuild} disabled={rebuilding} className="btn-secondary self-start px-3 flex items-center gap-2 disabled:opacity-50 sm:shrink-0" title="Regenerate from transactions">
          <RefreshCw size={16} className={rebuilding ? 'animate-spin' : ''} /> {rebuilding ? 'Rebuilding…' : 'Rebuild'}
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setShown(PAGE) }}
        placeholder="Search vendors…"
        className="input-base mt-4 w-full"
        aria-label="Search vendors"
      />

      {/* Bulk-merge bar - combine duplicate vendors (e.g. "Newday" + "Newday Airmont") */}
      {selectedVendors.length > 1 && (
        <div className="mt-4 card p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-ink-100">{selectedVendors.length} selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className="input-base" aria-label="Merge into">
              <option value="">Merge into…</option>
              {selectedVendors.map((v) => <option key={v.matchKey} value={v.matchKey}>{v.name}</option>)}
            </select>
            <button disabled={merging || !mergeTarget} onClick={() => runMerge(mergeTarget)} className="btn-primary px-4 disabled:opacity-50">
              {merging ? 'Merging…' : 'Merge'}
            </button>
            <button onClick={() => setSelected({})} className="px-2 text-body-sm text-ink-500 hover:text-ink-300">Clear</button>
          </div>
        </div>
      )}

      <div className="mt-4 card divide-y divide-canvas-soft">
        {filtered.slice(0, shown).map((v) => (
          <div key={v.id} className="flex items-center gap-3 p-3">
            <input
              type="checkbox"
              checked={!!selected[v.matchKey]}
              onChange={() => setSelected((s) => ({ ...s, [v.matchKey]: !s[v.matchKey] }))}
              className="h-4 w-4 shrink-0 accent-[#ff7a17]"
              aria-label={`Select ${v.name}`}
            />
            <div className="min-w-0 flex-1">
              {editingId === v.id ? (
                <input
                  autoFocus
                  defaultValue={v.name}
                  onBlur={(e) => {
                    if (escaped.current) { escaped.current = false; return }
                    rename(v, e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') { escaped.current = true; setEditingId(null) }
                  }}
                  className="input-base w-full py-1"
                  aria-label={`Rename ${v.name}`}
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-ink-100 truncate">{v.name}</p>
                  <button
                    onClick={() => setEditingId(v.id)}
                    className="shrink-0 p-1 text-ink-500 hover:text-ink-200 transition-colors"
                    title="Rename vendor"
                    aria-label={`Rename ${v.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
              <p className="text-body-sm text-ink-500 truncate">{v.count} transaction{v.count === 1 ? '' : 's'}</p>
            </div>
            <div className="w-48 shrink-0">
              <CategorySelect
                value={v.category}
                onChange={(c) => changeCategory(v, c)}
                categories={categories}
                ariaLabel={`Category for ${v.name}`}
                placeholder="Pick a category"
                className="input-base w-full"
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-ink-400">No vendors match “{search}”.</p>}
      </div>

      {shown < filtered.length && (
        <button onClick={() => setShown((s) => s + PAGE)} className="btn-secondary mt-4 w-full py-2">
          Show more ({filtered.length - shown} more)
        </button>
      )}
    </div>
  )
}
