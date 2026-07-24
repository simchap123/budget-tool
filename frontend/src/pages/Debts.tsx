import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Pencil, Trash2, ChevronDown } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { fetchAllRecords } from '../utils/fetchAll'
import { txAmount } from '../utils/reportStats'
import { merchantKey } from '../utils/merchant'
import { formatDate } from '../utils/dateRange'

interface Debt {
  id: string
  name: string
  type: string
  originalBalance: number
  matchKey: string
  startDate: string
}

const TYPES = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'car_loan', label: 'Car / Auto Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'other', label: 'Other' },
]

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

const emptyForm = { name: '', type: 'credit_card', originalBalance: '', matchKey: '', startDate: '' }

// Debt & loan payoff tracker. Each debt links to a vendor (merchant key); every
// transaction that rolls up to that vendor auto-applies to the balance. Balance
// progress only - no interest math.
export function Debts() {
  const toast = useToast()
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const auth = () => JSON.parse(localStorage.getItem('pb_auth') || '{}')
  const headers = () => ({ Authorization: `Bearer ${auth().token}` })

  const [debts, setDebts] = useState<Debt[]>([])
  const [txns, setTxns] = useState<any[]>([])
  const [vendors, setVendors] = useState<{ name: string; matchKey: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const [d, t, v] = await Promise.all([
        fetchAllRecords(apiUrl, 'debts', 'sort=-created', headers()).catch(() => []),
        fetchAllRecords(apiUrl, 'transactions', "filter=(type='expense')&sort=-date", headers()),
        fetchAllRecords(apiUrl, 'vendors', 'sort=-count', headers()).catch(() => []),
      ])
      setDebts(d as Debt[])
      setTxns(t)
      setVendors((v as any[]).map((x) => ({ name: x.name, matchKey: x.matchKey })))
    } catch {
      toast.error('Failed to load debts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Transactions applied to a debt: same merchant key, on/after its start date.
  const paymentsFor = (debt: Debt) =>
    txns.filter((t) => {
      if (!debt.matchKey) return false
      if (merchantKey(t.description || '') !== debt.matchKey) return false
      if (debt.startDate && String(t.date || '').slice(0, 10) < debt.startDate) return false
      return true
    })

  const stats = useMemo(() => {
    return debts.map((debt) => {
      const pays = paymentsFor(debt)
      const paid = pays.reduce((s, t) => s + txAmount(t), 0)
      const remaining = Math.max(0, debt.originalBalance - paid)
      const pct = debt.originalBalance > 0 ? Math.min(100, (paid / debt.originalBalance) * 100) : 0
      return { debt, paid, remaining, pct, count: pays.length }
    })
  }, [debts, txns])

  const totals = useMemo(() => ({
    original: debts.reduce((s, d) => s + (d.originalBalance || 0), 0),
    paid: stats.reduce((s, x) => s + x.paid, 0),
    remaining: stats.reduce((s, x) => s + x.remaining, 0),
  }), [debts, stats])

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (d: Debt) => {
    setEditingId(d.id)
    setForm({ name: d.name, type: d.type || 'other', originalBalance: String(d.originalBalance), matchKey: d.matchKey || '', startDate: d.startDate || '' })
    setShowForm(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(form.originalBalance)
    if (!form.name.trim()) return toast.error('Name is required')
    if (!(amt > 0)) return toast.error('Enter the starting balance')
    setSaving(true)
    try {
      const body = { name: form.name.trim(), type: form.type, originalBalance: amt, matchKey: form.matchKey.trim(), startDate: form.startDate.trim(), userId: auth().record.id }
      if (editingId) await axios.patch(`${apiUrl}/collections/debts/records/${editingId}`, body, { headers: headers() })
      else await axios.post(`${apiUrl}/collections/debts/records`, body, { headers: headers() })
      toast.success('Saved')
      setShowForm(false)
      await load()
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await axios.delete(`${apiUrl}/collections/debts/records/${id}`, { headers: headers() })
      setDeleteId(null)
      await load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><div className="text-lg text-ink-400">Loading debts…</div></div>
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display-lg">Debts &amp; Loans</h1>
          <p className="mt-2 text-ink-400">Track payoff - payments auto-apply from the linked vendor.</p>
        </div>
        <button onClick={openNew} className="btn-primary self-start px-4 sm:shrink-0">+ Add debt</button>
      </div>

      {/* Totals */}
      {debts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4 sm:p-6">
            <p className="text-body-sm text-ink-400">Total remaining</p>
            <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-dusk">{money(totals.remaining)}</p>
          </div>
          <div className="card p-4 sm:p-6">
            <p className="text-body-sm text-ink-400">Paid off</p>
            <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-breeze">{money(totals.paid)}</p>
          </div>
          <div className="card p-4 sm:p-6">
            <p className="text-body-sm text-ink-400">Original total</p>
            <p className="mt-2 text-2xl sm:text-3xl font-normal text-ink-100">{money(totals.original)}</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-8 space-y-3">
        {debts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-400">No debts tracked yet</p>
            <p className="mt-1 text-body-sm text-ink-500">Add a mortgage, credit card, or loan and link the vendor it's paid to.</p>
            <button onClick={openNew} className="btn-primary mt-6 px-4">+ Add your first debt</button>
          </div>
        ) : (
          stats.map(({ debt, paid, remaining, pct, count }) => {
            const isOpen = expanded === debt.id
            const pays = isOpen ? paymentsFor(debt) : []
            return (
              <div key={debt.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-ink-50">{debt.name} <span className="text-body-sm text-ink-500">· {TYPES.find((t) => t.value === debt.type)?.label || 'Other'}</span></p>
                    <p className="mt-1 text-body-sm text-ink-400">
                      {money(remaining)} left of {money(debt.originalBalance)}
                      {debt.matchKey ? <> · linked to {titleCase(debt.matchKey)}</> : <> · <span className="text-yellow-400">no vendor linked</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-body-sm font-normal text-accent-breeze">{pct.toFixed(0)}%</p>
                    <button onClick={() => openEdit(debt)} aria-label="Edit" className="p-1 text-ink-400 hover:text-ink-200"><Pencil size={16} /></button>
                    <button onClick={() => setDeleteId(debt.id)} aria-label="Delete" className="p-1 text-red-400 hover:bg-red-500/20 rounded"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas-soft">
                  <div className="h-full rounded-full bg-accent-breeze transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                {count > 0 && (
                  <button onClick={() => setExpanded(isOpen ? null : debt.id)} className="mt-2 inline-flex min-h-touch items-center gap-1 text-body-sm text-ink-500 hover:text-ink-300">
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {isOpen ? 'Hide payments' : `${count} payment${count === 1 ? '' : 's'} · ${money(paid)}`}
                  </button>
                )}
                {isOpen && (
                  <div className="mt-2 space-y-1 border-t border-ink-700 pt-3">
                    {pays.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 text-body-sm">
                        <span className="truncate text-ink-300">{formatDate(t.date)} · {t.description}</span>
                        <span className="shrink-0 text-accent-breeze">{money(txAmount(t))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add / edit form */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit debt' : 'Add debt'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-body-sm text-ink-400">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Sapphire, Home Mortgage" className="input-base" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-body-sm text-ink-400">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-base">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-body-sm text-ink-400">Starting balance</label>
              <input type="number" min="0" step="0.01" value={form.originalBalance} onChange={(e) => setForm({ ...form, originalBalance: e.target.value })} placeholder="0.00" className="input-base" required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-body-sm text-ink-400">Payments come from (vendor)</label>
            <select value={form.matchKey} onChange={(e) => setForm({ ...form, matchKey: e.target.value })} className="input-base">
              <option value="">- not linked (track manually) -</option>
              {form.matchKey && !vendors.some((v) => v.matchKey === form.matchKey) && <option value={form.matchKey}>{titleCase(form.matchKey)}</option>}
              {vendors.map((v) => <option key={v.matchKey} value={v.matchKey}>{v.name}</option>)}
            </select>
            <p className="mt-1 text-body-sm text-ink-500">Every transaction from this vendor auto-applies to the balance.</p>
          </div>
          <div>
            <label className="mb-1 block text-body-sm text-ink-400">Count payments from (optional)</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-base" />
            <p className="mt-1 text-body-sm text-ink-500">Leave blank to count all matching payments.</p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full py-2">{saving ? 'Saving…' : editingId ? 'Update' : 'Add debt'}</button>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Remove debt?"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => deleteId && remove(deleteId)} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">Remove</button>
          </div>
        }
      >
        <p className="text-ink-300">Remove this debt? Your transactions are not affected.</p>
      </Modal>
    </div>
  )
}
