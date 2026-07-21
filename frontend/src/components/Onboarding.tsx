import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { Sparkles, X, ArrowRight, Check, Landmark, Upload } from 'lucide-react'
import { fetchAllRecords } from '../utils/fetchAll'
import { reportTotals } from '../utils/reportStats'
import { suggestBudgets, BASIS_OPTIONS, BudgetBasis } from '../utils/budgetBasis'
import { recurringByCategory } from '../utils/budgetInsights'
import { CATEGORY_TIERS } from '../utils/categoryTiers'
import { invalidateCategories } from '../hooks/useCategories'
import { useToast } from './ui/Toast'

// AI-guided first-run setup: reads the user's spending, shows a short read on
// their trends & habits (via /api/ai/insights, with a deterministic fallback),
// then helps them apply per-category budgets and a giving goal in a couple taps.
export function Onboarding({
  onClose,
  onNavigate,
  onApplied,
}: {
  onClose: () => void
  onNavigate: (page: string) => void
  onApplied?: () => void
}) {
  const toast = useToast()
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const auth = () => JSON.parse(localStorage.getItem('pb_auth') || '{}')
  const headers = () => ({ Authorization: `Bearer ${auth().token}` })

  const [step, setStep] = useState(0)
  const [txns, setTxns] = useState<any[]>([])
  const [existingBudgets, setExistingBudgets] = useState<Record<string, string>>({}) // categoryLower -> budgetId
  const [givingId, setGivingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [insights, setInsights] = useState<{ narrative: string; habits: string[] } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  const [basis, setBasis] = useState<BudgetBasis>('avg6')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({}) // editable per-category budget
  const [applying, setApplying] = useState(false)

  const [givePercent, setGivePercent] = useState('10')
  const [chosenTier, setChosenTier] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  // Seed a starter category system. Users can rename/merge/add later.
  const pickTier = async (tierId: string) => {
    const tier = CATEGORY_TIERS.find((t) => t.id === tierId)
    if (!tier || seeding) return
    setSeeding(true)
    try {
      const { data } = await axios.post(`${apiUrl}/rpc/seed-categories`, { names: tier.categories }, { headers: headers() })
      setChosenTier(tierId)
      invalidateCategories()
      toast.success(`Added ${data?.created ?? tier.categories.length} ${tier.label.toLowerCase()} categories`)
    } catch (e: any) {
      toast.error('Could not add categories: ' + (e?.response?.data?.error || e?.message))
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [items, budgets, giving] = await Promise.all([
          fetchAllRecords(apiUrl, 'transactions', 'sort=-date', headers()),
          fetchAllRecords(apiUrl, 'budgets', 'perPage=500', headers()).catch(() => []),
          fetchAllRecords(apiUrl, 'giving', 'perPage=1', headers()).catch(() => []),
        ])
        setTxns(items)
        const bmap: Record<string, string> = {}
        for (const b of budgets) bmap[(b.category || '').toLowerCase()] = b.id
        setExistingBudgets(bmap)
        if (giving[0]) setGivingId(giving[0].id)
      } catch {
        /* handled by empty-state */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Deterministic spending summary — the backbone the whole wizard runs on, and
  // what we hand the AI for the narrative.
  const summary = useMemo(() => {
    const expense = txns.filter((t) => t.type === 'expense')
    const months = new Set(expense.map((t) => String(t.date || '').slice(0, 7)).filter((m) => m.length === 7))
    const monthCount = Math.max(months.size, 1)
    const totals = reportTotals(txns)
    const avg12 = suggestBudgets(txns, 'avg12', new Date())
    const topCategories = Object.entries(avg12)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, monthlyAvg]) => ({ category, monthlyAvg }))
    return {
      monthCount,
      transactionCount: txns.length,
      monthlyIncome: Math.round(totals.income / monthCount),
      monthlyExpense: Math.round(totals.expense / monthCount),
      savingsRate: Math.round(totals.savingsRate),
      topCategories,
    }
  }, [txns])

  // Recurring monthly commitment per category — a budget should never be
  // suggested below what the user is already committed to paying.
  const recurByCat = useMemo(() => recurringByCategory(txns), [txns])

  const suggestions = useMemo(() => {
    const map = suggestBudgets(txns, basis, new Date())
    const cats = new Set([...Object.keys(map), ...Object.keys(recurByCat)])
    return Array.from(cats)
      .map((cat) => {
        const basisAmt = map[cat] || 0
        const floor = Math.round(recurByCat[cat]?.monthly || 0)
        const amount = Math.max(basisAmt, floor)
        return { cat, amount, floor, floored: floor > basisAmt && floor > 0 }
      })
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }, [txns, basis, recurByCat])

  // Default-select categories without a budget, and reset the editable amount to
  // the fresh suggestion whenever the basis (and thus the suggestion) changes.
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev }
      for (const s of suggestions) {
        if (next[s.cat] === undefined) next[s.cat] = !existingBudgets[s.cat.toLowerCase()]
      }
      return next
    })
    setAmounts(Object.fromEntries(suggestions.map((s) => [s.cat, String(s.amount)])))
  }, [suggestions, existingBudgets])

  const loadInsights = async () => {
    if (insights || insightsLoading) return
    setInsightsLoading(true)
    try {
      const { data } = await axios.post(`${apiUrl}/ai/insights`, { summary }, { headers: headers() })
      setInsights({ narrative: data?.narrative || '', habits: Array.isArray(data?.habits) ? data.habits : [] })
    } catch {
      setInsights({ narrative: '', habits: [] })
    } finally {
      setInsightsLoading(false)
    }
  }

  const applyBudgets = async () => {
    setApplying(true)
    const chosen = suggestions.filter((s) => selected[s.cat])
    let done = 0
    try {
      for (const s of chosen) {
        const category = s.cat
        const amount = Math.max(1, Math.round(parseFloat(amounts[category]) || s.amount))
        const existingId = existingBudgets[category.toLowerCase()]
        if (existingId) {
          await axios.patch(`${apiUrl}/collections/budgets/records/${existingId}`, { budgetAmount: amount }, { headers: headers() })
        } else {
          const now = new Date()
          await axios.post(
            `${apiUrl}/collections/budgets/records`,
            { category, budgetAmount: amount, year: now.getFullYear(), month: now.getMonth() + 1, userId: auth().record.id },
            { headers: headers() }
          )
        }
        done++
      }
      toast.success(`Set ${done} budget${done === 1 ? '' : 's'}`)
      onApplied?.()
      setStep(txns.length > 0 ? 4 : step + 1)
    } catch (e: any) {
      toast.error('Could not save budgets: ' + (e.response?.data?.message || e.message))
    } finally {
      setApplying(false)
    }
  }

  const applyGiving = async () => {
    const pct = parseFloat(givePercent)
    if (!(pct >= 0)) { finish(); return }
    try {
      if (givingId) {
        await axios.patch(`${apiUrl}/collections/giving/records/${givingId}`, { percent: pct }, { headers: headers() })
      } else {
        await axios.post(`${apiUrl}/collections/giving/records`, { percent: pct, category: '', incomeCategory: '', userId: auth().record.id }, { headers: headers() })
      }
      toast.success('Giving goal set')
    } catch {
      /* non-blocking */
    }
    finish()
  }

  const finish = () => {
    localStorage.setItem('bt_onboarded', '1')
    onApplied?.()
    onClose()
  }

  const dismiss = () => {
    localStorage.setItem('bt_onboarded', '1')
    onClose()
  }

  const hasData = txns.length > 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 animate-overlay-in">
      <div className="card animate-sheet-up sm:animate-scale-in flex w-full max-w-lg max-h-[92dvh] flex-col rounded-b-none sm:rounded-sm">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 p-4 sm:p-5">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className="shrink-0 text-accent-sunset" />
            <h2 className="truncate text-lg font-normal text-ink-50">Set up with AI</h2>
          </div>
          <button onClick={dismiss} aria-label="Close" className="btn-icon -mr-2 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto scroll-contain p-4 sm:p-6">
          {loading ? (
            <p className="py-10 text-center text-ink-400">Reading your spending…</p>
          ) : step === 0 ? (
            <Welcome hasData={hasData} onPickTier={pickTier} chosenTier={chosenTier} seeding={seeding} />
          ) : step === 1 && !hasData ? (
            <NoData onNavigate={(p) => { dismiss(); onNavigate(p) }} />
          ) : step === 2 || (step === 1 && hasData) ? (
            <Trends summary={summary} insights={insights} insightsLoading={insightsLoading} />
          ) : step === 3 ? (
            <Budgets
              basis={basis}
              setBasis={setBasis}
              suggestions={suggestions}
              selected={selected}
              setSelected={setSelected}
              amounts={amounts}
              setAmounts={setAmounts}
              existingBudgets={existingBudgets}
            />
          ) : (
            <GivingStep percent={givePercent} setPercent={setGivePercent} />
          )}
        </div>

        {/* Footer nav */}
        {!loading && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-ink-700 p-4 sm:p-5">
            <button onClick={dismiss} className="text-body-sm text-ink-500 hover:text-ink-300">
              Skip for now
            </button>
            <StepButton
              step={step}
              hasData={hasData}
              applying={applying}
              selectedCount={suggestions.filter((s) => selected[s.cat]).length}
              onNext={() => {
                if (step === 0) {
                  const next = hasData ? 2 : 1
                  setStep(next)
                  if (hasData) loadInsights()
                } else if (step === 1 && hasData) {
                  loadInsights(); setStep(2)
                } else if (step === 2) {
                  setStep(3)
                } else if (step === 3) {
                  applyBudgets()
                } else {
                  applyGiving()
                }
              }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function StepButton({ step, hasData, applying, selectedCount, onNext }: any) {
  let label = 'Next'
  if (step === 0) label = hasData ? 'Analyze my spending' : 'Get started'
  else if (step === 2) label = 'Suggest budgets'
  else if (step === 3) label = applying ? 'Saving…' : selectedCount > 0 ? `Apply ${selectedCount} budget${selectedCount === 1 ? '' : 's'}` : 'Skip budgets'
  else if (step === 4) label = 'Finish'
  return (
    <button onClick={onNext} disabled={applying} className="btn-primary px-5">
      {label} {step !== 3 && step !== 4 && <ArrowRight size={16} className="ml-1 inline" />}
    </button>
  )
}

function Welcome({
  hasData,
  onPickTier,
  chosenTier,
  seeding,
}: {
  hasData: boolean
  onPickTier: (id: string) => void
  chosenTier: string | null
  seeding: boolean
}) {
  return (
    <div>
      <div className="text-center">
        <h3 className="text-display-sm">Let's build your budget</h3>
        <p className="mx-auto mt-3 max-w-sm text-ink-400">
          {hasData
            ? "I'll look at your spending, show you the trends and habits I notice, then suggest budgets you can apply in one tap."
            : "First we need some transactions. Connect a bank or import a CSV, then come back and I'll set everything up."}
        </p>
      </div>

      {/* Starter category system — pick one, add/rename/merge more anytime. */}
      <div className="mt-6">
        <p className="mb-2 text-body-sm text-ink-400">How detailed do you want your categories?</p>
        <div className="space-y-2">
          {CATEGORY_TIERS.map((t) => {
            const active = chosenTier === t.id
            return (
              <button
                key={t.id}
                onClick={() => onPickTier(t.id)}
                disabled={seeding}
                className={`flex w-full items-center gap-3 rounded-sm border p-3 text-left transition-colors disabled:opacity-60 ${
                  active ? 'border-accent-sunset bg-accent-sunset/10' : 'border-ink-700 hover:bg-canvas-soft'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-ink-100">
                    {t.label} {t.id === 'standard' && <span className="text-body-sm text-accent-sunset">· recommended</span>}
                  </span>
                  <span className="block text-body-sm text-ink-500">{t.blurb} ({t.categories.length} categories)</span>
                  {/* A few real examples so the level of detail is concrete. */}
                  <span className="mt-0.5 block truncate text-body-sm text-ink-600">
                    e.g. {t.categories.slice(0, 3).join(' · ')}…
                  </span>
                </span>
                {active && <Check size={18} className="shrink-0 text-accent-sunset" />}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-body-sm text-ink-500">Optional — you can skip this and add categories as you go.</p>
      </div>
    </div>
  )
}

function NoData({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-ink-300">Add your transactions to get started:</p>
      <button onClick={() => onNavigate('settings')} className="btn-secondary w-full justify-start px-4">
        <Landmark size={16} className="mr-2" /> Connect a bank (auto-sync)
      </button>
      <button onClick={() => onNavigate('dashboard')} className="btn-secondary w-full justify-start px-4">
        <Upload size={16} className="mr-2" /> Import a CSV
      </button>
    </div>
  )
}

function Trends({ summary, insights, insightsLoading }: any) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Avg income / mo" value={`$${summary.monthlyIncome.toLocaleString()}`} tone="text-accent-sunset" />
        <Stat label="Avg spend / mo" value={`$${summary.monthlyExpense.toLocaleString()}`} tone="text-accent-dusk" />
        <Stat label="Savings rate" value={`${summary.savingsRate}%`} tone="text-accent-breeze" />
        <Stat label="Months tracked" value={String(summary.monthCount)} tone="text-ink-100" />
      </div>

      <div className="mt-5">
        <h4 className="flex items-center gap-2 text-body-sm text-ink-400">
          <Sparkles size={14} className="text-accent-sunset" /> What I notice
        </h4>
        {insightsLoading ? (
          <p className="mt-2 text-ink-400">Thinking…</p>
        ) : insights?.narrative ? (
          <>
            <p className="mt-2 text-ink-200">{insights.narrative}</p>
            {insights.habits?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {insights.habits.map((h: string, i: number) => (
                  <li key={i} className="flex gap-2 text-body-sm text-ink-300">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent-breeze" /> {h}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          // Deterministic fallback when the AI is unavailable.
          <div className="mt-2 text-ink-300">
            <p>
              Your biggest categories are{' '}
              {summary.topCategories.slice(0, 3).map((c: any) => c.category).join(', ') || 'still building up'}.
              You're saving about {summary.savingsRate}% of income.
            </p>
          </div>
        )}
      </div>

      {summary.topCategories.length > 0 && (
        <div className="mt-5">
          <h4 className="text-body-sm text-ink-400">Top categories · monthly average</h4>
          <div className="mt-2 space-y-1">
            {summary.topCategories.slice(0, 5).map((c: any) => (
              <div key={c.category} className="flex justify-between text-body-sm">
                <span className="text-ink-300">{c.category}</span>
                <span className="text-ink-100">${c.monthlyAvg.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Budgets({ basis, setBasis, suggestions, selected, setSelected, amounts, setAmounts, existingBudgets }: any) {
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-body-sm text-ink-400">Base budgets on</span>
        <select value={basis} onChange={(e) => setBasis(e.target.value)} className="input-base" aria-label="Budget basis">
          {BASIS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-body-sm text-ink-500">
        {BASIS_OPTIONS.find((o) => o.value === basis)?.hint} · amounts are editable, and never dip below what recurs.
      </p>

      <div className="mt-4 space-y-1">
        {suggestions.length === 0 ? (
          <p className="py-6 text-center text-ink-400">Not enough spending history yet.</p>
        ) : (
          suggestions.map((s: any) => {
            const cat = s.cat
            const has = !!existingBudgets[cat.toLowerCase()]
            return (
              <div key={cat} className="flex min-h-touch items-center gap-3 rounded-sm px-2">
                <input
                  type="checkbox"
                  checked={!!selected[cat]}
                  onChange={(e) => setSelected((prev: any) => ({ ...prev, [cat]: e.target.checked }))}
                  aria-label={`Include ${cat}`}
                  className="h-4 w-4 shrink-0 accent-[#ff7a17]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink-200">{cat}</span>
                  {(has || s.floored) && (
                    <span className="block text-body-sm text-ink-500">
                      {has && 'updates existing'}
                      {has && s.floored && ' · '}
                      {s.floored && <span className="text-accent-twilight">🔁 covers ${s.floor}/mo recurring</span>}
                    </span>
                  )}
                </span>
                {/* Editable amount, so users can adjust or add their own number. */}
                <span className="inline-flex shrink-0 items-center gap-1">
                  <span className="text-ink-500">$</span>
                  <input
                    type="number"
                    min="0"
                    value={amounts[cat] ?? String(s.amount)}
                    onChange={(e) => setAmounts((prev: any) => ({ ...prev, [cat]: e.target.value }))}
                    aria-label={`Budget for ${cat}`}
                    className="w-20 rounded-sm border border-ink-500 bg-canvas-soft px-2 py-1 text-right text-ink-50 focus:border-accent-sunset focus:outline-none"
                  />
                  <span className="text-body-sm text-ink-500">/mo</span>
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function GivingStep({ percent, setPercent }: any) {
  return (
    <div>
      <h3 className="text-lg text-ink-50">Giving goal (optional)</h3>
      <p className="mt-2 text-ink-400">Track a percentage of your income toward giving — tithe, charity, anything.</p>
      <label className="mt-4 block">
        <span className="mb-1 block text-body-sm text-ink-400">Give this % of income</span>
        <input
          type="number"
          min="0"
          max="100"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className="input-base"
          aria-label="Giving percentage"
        />
      </label>
      <p className="mt-2 text-body-sm text-ink-500">Leave at 0 to skip. You can fine-tune this later on the Giving page.</p>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="card p-3">
      <p className="text-body-sm text-ink-400">{label}</p>
      <p className={`mt-1 text-xl font-normal ${tone}`}>{value}</p>
    </div>
  )
}
