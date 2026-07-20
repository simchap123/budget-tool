import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Store, RefreshCw } from 'lucide-react'
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
// the normalized merchant key), and a vendor carries a category — so changing a
// vendor's category re-files every transaction from that merchant at once.
export function Vendors() {
  const toast = useToast()
  const categories = useCategories()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [rebuilding, setRebuilding] = useState(false)

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
    return <div className="flex h-screen items-center justify-center"><div className="text-lg text-ink-400">Loading vendors…</div></div>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-accent-twilight/15 text-accent-twilight"><Store size={22} /></div>
          <div>
            <h1 className="text-display-lg">Vendors</h1>
            <p className="mt-1 text-ink-400">{vendors.length} merchants · set a category once and every transaction from it follows</p>
          </div>
        </div>
        <button onClick={rebuild} disabled={rebuilding} className="btn-secondary py-2 px-3 flex items-center gap-2 disabled:opacity-50" title="Regenerate from transactions">
          <RefreshCw size={16} className={rebuilding ? 'animate-spin' : ''} /> {rebuilding ? 'Rebuilding…' : 'Rebuild'}
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setShown(PAGE) }}
        placeholder="Search vendors…"
        className="input-base mt-6 w-full"
        aria-label="Search vendors"
      />

      <div className="mt-4 card divide-y divide-canvas-soft">
        {filtered.slice(0, shown).map((v) => (
          <div key={v.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-ink-100 truncate">{v.name}</p>
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
