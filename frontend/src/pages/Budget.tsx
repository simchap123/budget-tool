import { useState, useEffect } from 'react'
import axios from 'axios'
import { ChevronLeft, ChevronRight, ChevronDown, Pencil, Trash2, Repeat } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { BudgetProgressBar } from '../components/ui/BudgetProgressBar'
import { CategorySelect } from '../components/ui/CategorySelect'
import { TransactionsModal } from '../components/ui/TransactionsModal'
import { monthRange } from '../utils/dateRange'
import { averageMonthlySpend } from '../utils/budgetSuggest'
import { txAmount } from '../utils/reportStats'
import { fetchAllRecords } from '../utils/fetchAll'
import {
  vendorSpendInCategory,
  recurringByCategory,
  recurringKeySet,
  totalMonthlyRecurring,
  fixedFlexible,
  CategoryRecurring,
} from '../utils/budgetInsights'

interface Budget {
  id: string
  categoryId: string
  categoryName: string
  budgetAmount: number
}

interface Transaction {
  categoryId: string
  categoryName: string
  spent: number
}

export function Budget() {
  const toast = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ category: '', budgetAmount: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [drill, setDrill] = useState<string | null>(null)
  // Raw current-month expenses (for the per-category vendor breakdown), plus a
  // 6-month view of recurring charges mapped to their categories.
  const [monthTxns, setMonthTxns] = useState<any[]>([])
  const [recurByCat, setRecurByCat] = useState<Record<string, CategoryRecurring>>({})
  const [recurKeys, setRecurKeys] = useState<Set<string>>(new Set())
  const [totalRecurring, setTotalRecurring] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showRecurringList, setShowRecurringList] = useState(false)

  useEffect(() => {
    fetchBudgetData()
  }, [currentDate])

  // Recurring is a trailing-6-month concept, independent of the selected month.
  useEffect(() => {
    const loadRecurring = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
        const apiUrl = import.meta.env.VITE_API_URL || '/api'
        const since = new Date()
        since.setMonth(since.getMonth() - 6)
        const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-01`
        const filter = encodeURIComponent(`(date>='${sinceStr}'&&type='expense')`)
        const items = await fetchAllRecords(apiUrl, 'transactions', `filter=${filter}&sort=date`, {
          Authorization: `Bearer ${auth.token}`,
        })
        setRecurByCat(recurringByCategory(items))
        setRecurKeys(recurringKeySet(items))
        setTotalRecurring(totalMonthlyRecurring(items))
      } catch {
        /* recurring is additive — ignore failures */
      }
    }
    loadRecurring()
  }, [])

  const fetchBudgetData = async () => {
    try {
      setLoading(true)
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      const ym = `${year}-${String(month).padStart(2, '0')}`
      const { start: monthStart, endExclusive } = monthRange(ym)

      // Budgets carry forward: one per category, applied to EVERY month (not
      // tied to the month they were created in). Only "spent" is month-specific.
      const budgetFilter = encodeURIComponent(`(userId='${auth.record.id}')`)
      const txnFilter = encodeURIComponent(`(date>='${monthStart}'&&date<'${endExclusive}'&&type='expense')`)

      const [budgetResponse, transactionResponse] = await Promise.all([
        axios.get(
          `${apiUrl}/collections/budgets/records?filter=${budgetFilter}&perPage=500`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        ).catch(() => ({ data: { items: [] } })),
        axios.get(
          `${apiUrl}/collections/transactions/records?filter=${txnFilter}&perPage=500`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        ),
      ])

      const txns = transactionResponse.data.items || []
      setMonthTxns(txns) // kept raw for the per-category vendor breakdown
      const categorySpent: { [key: string]: number } = {}
      txns.forEach((txn: any) => {
        const key = txn.category || 'Uncategorized'
        categorySpent[key] = (categorySpent[key] || 0) + txAmount(txn)
      })

      // Dedup by category (keep the most recent) in case old per-month rows exist.
      const byCategory: { [key: string]: any } = {}
      ;(budgetResponse.data.items || []).forEach((b: any) => {
        const key = (b.category || 'Uncategorized').toLowerCase()
        const prev = byCategory[key]
        if (!prev || String(b.created || '') > String(prev.created || '')) byCategory[key] = b
      })
      setBudgets(Object.values(byCategory).map((b: any) => ({
        ...b,
        categoryName: b.category || 'Uncategorized',
      })))

      setTransactions(
        Object.entries(categorySpent).map(([category, spent]) => ({
          categoryId: category,
          categoryName: category,
          spent: spent as number,
        }))
      )
    } catch (err) {
      console.error('Error fetching budget data:', err)
      toast.error('Failed to load budget data')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const openNewBudget = () => {
    setEditingId(null)
    setFormData({ category: '', budgetAmount: '' })
    setShowForm(true)
  }

  const openEditBudget = (budget: Budget) => {
    setEditingId(budget.id)
    setFormData({ category: budget.categoryName, budgetAmount: String(budget.budgetAmount) })
    setShowForm(true)
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(formData.budgetAmount)
    if (!formData.category.trim()) {
      toast.error('Category is required')
      return
    }
    if (!(amount > 0)) {
      toast.error('Enter a budget amount greater than 0')
      return
    }

    setSubmitting(true)
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      const cat = formData.category.trim()
      // Upsert by category so one category never gets duplicate budgets.
      const existing = editingId
        ? budgets.find((b) => b.id === editingId)
        : budgets.find((b) => b.categoryName.toLowerCase() === cat.toLowerCase())

      if (existing) {
        await axios.patch(
          `${apiUrl}/collections/budgets/records/${existing.id}`,
          { category: cat, budgetAmount: amount },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        )
        toast.success('Budget updated')
      } else {
        await axios.post(
          `${apiUrl}/collections/budgets/records`,
          { category: cat, budgetAmount: amount, year, month, userId: auth.record.id },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        )
        toast.success('Budget set — it now applies every month')
      }

      setFormData({ category: '', budgetAmount: '' })
      setShowForm(false)
      setEditingId(null)
      await fetchBudgetData()
    } catch (err: any) {
      console.error('Error saving budget:', err)
      toast.error('Failed to save budget')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuggestBudgets = async () => {
    setSuggesting(true)
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      // Look back 4 months of expenses.
      const since = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1)
      const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-01`
      const filter = encodeURIComponent(`(date>='${sinceStr}'&&type='expense')`)
      const items = await fetchAllRecords(apiUrl, 'transactions', `filter=${filter}&sort=-date`, {
        Authorization: `Bearer ${auth.token}`,
      })
      const avg = averageMonthlySpend(items)
      const existing = new Set(budgets.map((b) => b.categoryName))
      const toCreate = Object.entries(avg)
        .filter(([cat, amt]) => amt > 0 && !existing.has(cat))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)

      if (toCreate.length === 0) {
        toast.info('No new suggestions — you already have budgets for your spending')
        return
      }
      for (const [category, budgetAmount] of toCreate) {
        await axios.post(
          `${apiUrl}/collections/budgets/records`,
          { category, budgetAmount, year, month, userId: auth.record.id },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        )
      }
      toast.success(`Created ${toCreate.length} budget${toCreate.length === 1 ? '' : 's'} from your average spend`)
      await fetchBudgetData()
    } catch (err) {
      console.error('Error suggesting budgets:', err)
      toast.error('Failed to suggest budgets')
    } finally {
      setSuggesting(false)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      await axios.delete(`${apiUrl}/collections/budgets/records/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      toast.success('Budget removed')
      setDeleteId(null)
      await fetchBudgetData()
    } catch (err) {
      console.error('Error deleting budget:', err)
      toast.error('Failed to remove budget')
    }
  }

  // Category suggestions for the datalist: union of budgeted + spent categories.
  const knownCategories = Array.from(
    new Set([...budgets.map((b) => b.categoryName), ...transactions.map((t) => t.categoryName)])
  ).filter(Boolean).sort()

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.budgetAmount || 0), 0)
  const totalSpent = transactions.reduce((sum, t) => sum + (t.spent || 0), 0)
  const remaining = totalBudgeted - totalSpent

  // Every recurring charge, flattened across categories, biggest first — the
  // list the retired Recurring page used to show.
  const allRecurring = Object.entries(recurByCat)
    .flatMap(([category, r]) => r.vendors.map((v) => ({ ...v, category })))
    .sort((a, b) => b.monthly - a.monthly)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-ink-400">Loading budget...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display-lg">Budget</h1>
          <p className="mt-2 text-ink-400">
            Zero-based budgeting · showing spend for {monthYear}
          </p>
          <p className="mt-1 text-body-sm text-ink-500">
            Budgets carry forward every month — set them once.
          </p>
        </div>
        {/* wrap, don't shrink-0: two full-width buttons side by side were
            575px wide and forced the whole page to scroll sideways. */}
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <button
            onClick={handleSuggestBudgets}
            disabled={suggesting}
            className="btn-secondary py-2 px-4 disabled:opacity-50"
            title="Create budgets from your average monthly spend"
          >
            {suggesting ? 'Suggesting…' : 'Suggest from spending'}
          </button>
          <button
            onClick={() => (showForm ? setShowForm(false) : openNewBudget())}
            className="btn-primary py-2 px-4"
          >
            {showForm ? 'Cancel' : '+ Set Budget'}
          </button>
        </div>
      </div>

      {/* Budget Form */}
      {showForm && (
        <div className="mt-6 card p-6 animate-fade-in">
          <h3 className="text-lg font-normal text-ink-50 mb-4">
            {editingId ? 'Edit Budget' : `Set a budget for ${monthYear}`}
          </h3>
          <form onSubmit={handleSaveBudget} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">Category</label>
              {editingId ? (
                <input type="text" value={formData.category} disabled className="input-base opacity-60" />
              ) : (
                <CategorySelect
                  value={formData.category}
                  onChange={(v) => setFormData({ ...formData, category: v })}
                  categories={knownCategories}
                  ariaLabel="Budget category"
                  placeholder="Pick or add a category"
                  className="input-base"
                />
              )}
            </div>
            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">Monthly amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                className="input-base"
                required
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary py-2 px-4">
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Set Budget'}
            </button>
          </form>
        </div>
      )}

      {/* Month Navigator */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button onClick={handlePrevMonth} aria-label="Previous month" className="btn-icon">
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-normal min-w-[9rem] sm:min-w-[200px] text-center">{monthYear}</span>
        <button onClick={handleNextMonth} aria-label="Next month" className="btn-icon">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Budget Summary */}
      <div className="mt-8 card p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-body-sm text-ink-400">Budgeted</p>
            <p className="mt-1 text-xl sm:text-2xl font-normal text-accent-sunset break-words">${totalBudgeted.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-body-sm text-ink-400">Spent</p>
            <p className="mt-1 text-xl sm:text-2xl font-normal text-accent-dusk break-words">${totalSpent.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-body-sm text-ink-400">Remaining</p>
            <p className={`mt-1 text-xl sm:text-2xl font-normal break-words ${remaining >= 0 ? 'text-accent-breeze' : 'text-red-400'}`}>
              ${Math.abs(remaining).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <BudgetProgressBar spent={totalSpent} budgeted={totalBudgeted} />
        </div>
      </div>

      {/* Recurring / fixed — the committed part of the plan. Expands to the full
          subscription list, which is why the standalone Recurring page retired. */}
      {totalRecurring > 0 && (
        <div className="mt-4 card p-4 sm:p-6">
          <button
            onClick={() => setShowRecurringList((v) => !v)}
            aria-expanded={showRecurringList}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Repeat size={18} className="text-accent-twilight" />
              <p className="text-body-sm text-ink-400">Recurring &amp; bills each month</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-normal text-accent-twilight">${totalRecurring.toFixed(0)}<span className="text-body-sm text-ink-500">/mo</span></p>
              <ChevronDown size={16} className={`text-ink-500 transition-transform ${showRecurringList ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <p className="mt-1 text-body-sm text-ink-500">
            Detected subscriptions &amp; bills — the fixed part of your budget that repeats every month.
          </p>
          {showRecurringList && (
            <div className="mt-3 space-y-1.5 border-t border-ink-700 pt-3">
              {allRecurring.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3 text-body-sm">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Repeat size={11} className="shrink-0 text-accent-twilight" />
                    <span className="truncate text-ink-200">{r.label}</span>
                    <span className="shrink-0 text-ink-500">· {r.category}</span>
                  </span>
                  <span className="shrink-0 text-ink-100">${r.monthly.toFixed(0)}/mo</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Budget Items */}
      <div className="mt-8">
        {budgets.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-400">No budgets set for this month</p>
            <p className="mt-1 text-body-sm text-ink-500">Set a budget amount per category to start tracking</p>
            <button onClick={openNewBudget} className="btn-primary mt-6 py-2 px-4">
              + Set your first budget
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const spent = transactions.find((t) => t.categoryName === budget.categoryName)?.spent || 0
              const percent = budget.budgetAmount > 0 ? (spent / budget.budgetAmount) * 100 : 0
              const rec = recurByCat[budget.categoryName]
              const isOpen = expanded === budget.categoryName
              const vendors = isOpen ? vendorSpendInCategory(monthTxns, budget.categoryName) : []
              const maxVendor = vendors.reduce((m, v) => Math.max(m, v.spent), 0)

              return (
                <div key={budget.id} className="card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setDrill(budget.categoryName)}
                      className="flex-1 text-left hover:opacity-80 transition-opacity"
                      title="See transactions"
                    >
                      <p className="font-normal text-ink-50 underline decoration-dotted decoration-ink-600 underline-offset-4">{budget.categoryName}</p>
                      <p className="mt-1 text-body-sm text-ink-400">
                        ${spent.toFixed(2)} of ${budget.budgetAmount.toFixed(2)}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <p className={`text-body-sm font-normal ${
                        percent > 100 ? 'text-red-400' :
                        percent > 90 ? 'text-yellow-400' :
                        'text-accent-breeze'
                      }`}>
                        {percent.toFixed(0)}%
                      </p>
                      <button
                        onClick={() => openEditBudget(budget)}
                        className="p-1 text-ink-400 hover:text-ink-200 transition-colors"
                        title="Edit budget"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(budget.id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        title="Delete budget"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <BudgetProgressBar spent={spent} budgeted={budget.budgetAmount} color={
                      percent > 100 ? 'red' :
                      percent > 90 ? 'yellow' :
                      'green'
                    } />
                  </div>

                  {/* Fixed vs flexible: how much of this budget is committed to
                      recurring charges vs free to steer. */}
                  {rec && budget.budgetAmount > 0 && (() => {
                    const { fixed, flexible, over } = fixedFlexible(budget.budgetAmount, rec.monthly)
                    const fixedPct = (fixed / budget.budgetAmount) * 100
                    return (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-body-sm">
                          <span className="inline-flex items-center gap-1 text-accent-twilight">
                            <Repeat size={11} /> Fixed ${fixed.toFixed(0)}
                          </span>
                          <span className="text-ink-400">Flexible ${flexible.toFixed(0)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas-soft" title={`Fixed $${fixed.toFixed(0)} of $${budget.budgetAmount.toFixed(0)}`}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${fixedPct}%`, backgroundColor: '#c4b5fd' }} />
                        </div>
                        {over > 0 && (
                          <p className="mt-1 text-body-sm text-yellow-400">
                            Recurring is ${over.toFixed(0)} over this budget — consider raising it.
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {/* Thermometer by vendor: which merchants make up this category */}
                  {spent > 0 && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : budget.categoryName)}
                      aria-expanded={isOpen}
                      className="mt-2 inline-flex min-h-touch items-center gap-1 text-body-sm text-ink-500 hover:text-ink-300"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      {isOpen ? 'Hide vendors' : 'By vendor'}
                    </button>
                  )}

                  {isOpen && (
                    <div className="mt-2 space-y-2 border-t border-ink-700 pt-3">
                      {vendors.length === 0 ? (
                        <p className="text-body-sm text-ink-500">No spending in this category this month.</p>
                      ) : (
                        vendors.map((v) => {
                          const w = maxVendor > 0 ? (v.spent / maxVendor) * 100 : 0
                          const isRec = recurKeys.has(v.key)
                          return (
                            <div key={v.key}>
                              <div className="flex items-center justify-between gap-2 text-body-sm">
                                <span className="inline-flex min-w-0 items-center gap-1">
                                  <span className="truncate text-ink-300">{v.label}</span>
                                  {isRec && <Repeat size={11} className="shrink-0 text-accent-twilight" aria-label="recurring" />}
                                </span>
                                <span className="shrink-0 text-ink-200">${v.spent.toFixed(2)}</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas-soft">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${w}%`, backgroundColor: isRec ? '#c4b5fd' : '#ff7a17' }}
                                />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Remove Budget?"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => deleteId && handleDeleteBudget(deleteId)}
              className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        }
      >
        <p className="text-ink-300">
          Remove this budget? Your transactions in this category are not affected.
        </p>
      </Modal>

      {drill && (() => {
        const ym = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
        const { start, endExclusive } = monthRange(ym)
        return (
          <TransactionsModal
            title={drill}
            subtitle={`${monthYear} · spending in this category`}
            category={drill}
            type="expense"
            since={start}
            until={endExclusive}
            onClose={() => setDrill(null)}
          />
        )
      })()}
    </div>
  )
}
