import { useState, useEffect } from 'react'
import axios from 'axios'
import { HandHeart } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { BudgetProgressBar } from '../components/ui/BudgetProgressBar'
import { computeGiving, GivingSummary } from '../utils/givingCalc'
import { monthLabel } from '../utils/dateRange'
import { fetchAllRecords } from '../utils/fetchAll'
import { CategorySelect } from '../components/ui/CategorySelect'
import { TransactionsModal } from '../components/ui/TransactionsModal'
import { monthRange } from '../utils/dateRange'

export function Giving() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [txns, setTxns] = useState<any[]>([])
  const [configId, setConfigId] = useState<string | null>(null)
  const [percent, setPercent] = useState('10')
  const [category, setCategory] = useState('')
  const [incomeCategory, setIncomeCategory] = useState('')
  const [drill, setDrill] = useState<'month' | 'all' | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const auth = () => JSON.parse(localStorage.getItem('pb_auth') || '{}')
  const headers = () => ({ Authorization: `Bearer ${auth().token}` })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const uid = auth().record?.id
      const [cfgRes, allTxns] = await Promise.all([
        axios
          .get(`${apiUrl}/collections/giving/records?filter=${encodeURIComponent(`(userId='${uid}')`)}`, { headers: headers() })
          .catch(() => ({ data: { items: [] } })),
        fetchAllRecords(apiUrl, 'transactions', 'sort=-date', headers()),
      ])
      const cfg = (cfgRes.data.items || [])[0]
      if (cfg) {
        setConfigId(cfg.id)
        setPercent(String(cfg.percent ?? 10))
        setCategory(cfg.category || '')
        setIncomeCategory(cfg.incomeCategory || '')
      }
      setTxns(allTxns)
    } catch (e) {
      console.error('Error loading giving:', e)
      toast.error('Failed to load giving data')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    const pct = parseFloat(percent)
    if (!(pct > 0)) return toast.error('Enter a percentage greater than 0')
    if (!category.trim()) return toast.error('Pick which category counts as giving')
    setSaving(true)
    try {
      const body = { userId: auth().record.id, percent: pct, category: category.trim(), incomeCategory: incomeCategory.trim() }
      if (configId) {
        await axios.patch(`${apiUrl}/collections/giving/records/${configId}`, body, { headers: headers() })
      } else {
        const r = await axios.post(`${apiUrl}/collections/giving/records`, body, { headers: headers() })
        setConfigId(r.data.id)
      }
      toast.success('Giving goal saved')
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const categories = Array.from(
    new Set(txns.filter((t) => t.type === 'expense').map((t) => t.category).filter(Boolean))
  ).sort()
  const incomeCategories = Array.from(
    new Set(txns.filter((t) => t.type === 'income').map((t) => t.category).filter(Boolean))
  ).sort()

  const summary: GivingSummary = computeGiving(txns, parseFloat(percent) || 0, category, incomeCategory)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const current = summary.months.find((m) => m.month === thisMonth) || { month: thisMonth, income: 0, target: 0, given: 0, remaining: 0 }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-ink-400">Loading giving…</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="flex items-start gap-3">
        <div className="shrink-0 p-2 rounded-full bg-accent-twilight/15 text-accent-twilight">
          <HandHeart size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="text-display-lg">Giving</h1>
          <p className="mt-1 text-ink-400">Track a percentage of your income toward giving (tithe, charity, etc.)</p>
        </div>
      </div>

      {/* Config */}
      <form onSubmit={saveConfig} className="mt-8 card p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-body-sm text-ink-400 mb-1">Give this % of income</label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.5" min="0" value={percent}
                onChange={(e) => setPercent(e.target.value)}
                aria-label="Giving percentage"
                className="input-base w-24"
              />
              <span className="text-ink-300">%</span>
            </div>
          </div>
          <div className="min-w-[12rem]">
            <label className="block text-body-sm text-ink-400 mb-1">Giving category</label>
            <CategorySelect
              value={category}
              onChange={setCategory}
              categories={categories}
              ariaLabel="Giving category"
              placeholder="Pick a category (e.g. Charity)"
              className="input-base w-full"
            />
          </div>
          <div className="min-w-[12rem]">
            <label className="block text-body-sm text-ink-400 mb-1">Tithe on income from</label>
            <CategorySelect
              value={incomeCategory}
              onChange={setIncomeCategory}
              categories={incomeCategories}
              ariaLabel="Income source category"
              placeholder="All income"
              className="input-base w-full"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary py-2 px-4 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save goal'}
          </button>
        </div>
        <p className="mt-2 text-body-sm text-ink-500">
          Leave "income from" blank to tithe on all income, or pick a category (e.g. Paychecks) to tithe only on that.
        </p>
        {!category && (
          <p className="mt-3 text-body-sm text-ink-500">
            Tip: create a "Charity" or "Tithe" category and tag your giving transactions with it — they'll count here automatically.
          </p>
        )}
      </form>

      {/* This month */}
      <div className="mt-8 card p-6">
        <h3 className="text-body-sm text-ink-400">{monthLabel(thisMonth)} · giving goal</h3>
        <div className="mt-3">
          <BudgetProgressBar spent={current.given} budgeted={current.target} color="#8b7fd6" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-body-sm text-ink-500">Income</p>
            <p className="text-lg text-ink-100">${current.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-body-sm text-ink-500">Target ({percent || 0}%)</p>
            <p className="text-lg text-accent-twilight">${current.target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-body-sm text-ink-500">Given</p>
            <button type="button" onClick={() => category && setDrill('month')} className="inline-flex min-h-touch items-center text-lg text-accent-sunset underline decoration-dotted decoration-ink-600 underline-offset-4 hover:opacity-80" title="See this month's giving">
              ${current.given.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
          </div>
        </div>
        <p className="mt-3 text-center text-body-sm">
          {current.remaining > 0
            ? <span className="text-ink-300">${current.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left to give this month</span>
            : <span className="text-accent-breeze">Goal met — ${Math.abs(current.remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} over 🎉</span>}
        </p>
      </div>

      {/* Cumulative */}
      <div className="mt-6 card p-6">
        <h3 className="text-body-sm text-ink-400">All-time</h3>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-body-sm text-ink-500">Total given</p>
            <button type="button" onClick={() => category && setDrill('all')} className="inline-flex min-h-touch items-center text-xl sm:text-2xl text-accent-sunset underline decoration-dotted decoration-ink-600 underline-offset-4 hover:opacity-80" title="See all giving transactions">
              ${summary.totalGiven.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
          </div>
          <div><p className="text-body-sm text-ink-500">Total target</p><p className="text-2xl text-accent-twilight">${summary.totalTarget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          <div>
            <p className="text-body-sm text-ink-500">{summary.balance >= 0 ? 'Ahead by' : 'Behind by'}</p>
            <p className={`text-2xl ${summary.balance >= 0 ? 'text-accent-breeze' : 'text-red-400'}`}>${Math.abs(summary.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Monthly breakdown */}
      {summary.months.length > 0 && (
        <div className="mt-6 card p-4 table-scroll">
          <table className="w-full min-w-[34rem] text-body-sm">
            <thead><tr className="text-ink-500 text-left">
              <th className="py-2">Month</th><th className="text-right">Income</th><th className="text-right">Target</th><th className="text-right">Given</th><th className="text-right">+/-</th>
            </tr></thead>
            <tbody>
              {summary.months.slice().reverse().map((m) => (
                <tr key={m.month} className="border-t border-canvas-soft">
                  <td className="py-2 text-ink-200">{monthLabel(m.month)}</td>
                  <td className="text-right text-ink-300">${m.income.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  <td className="text-right text-accent-twilight">${m.target.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  <td className="text-right text-accent-sunset">${m.given.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  <td className={`text-right ${m.remaining <= 0 ? 'text-accent-breeze' : 'text-ink-400'}`}>
                    {m.remaining <= 0 ? '+' : '-'}${Math.abs(m.remaining).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drill && (
        <TransactionsModal
          title={`${category} giving`}
          subtitle={drill === 'month' ? `${monthLabel(thisMonth)} · giving transactions` : 'All-time giving transactions'}
          category={category}
          type="expense"
          since={drill === 'month' ? monthRange(thisMonth).start : undefined}
          until={drill === 'month' ? monthRange(thisMonth).endExclusive : undefined}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  )
}
