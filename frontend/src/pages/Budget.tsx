import { useState, useEffect } from 'react'
import axios from 'axios'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { BudgetProgressBar } from '../components/ui/BudgetProgressBar'
import { monthRange } from '../utils/dateRange'

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

  useEffect(() => {
    fetchBudgetData()
  }, [currentDate])

  const fetchBudgetData = async () => {
    try {
      setLoading(true)
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      const ym = `${year}-${String(month).padStart(2, '0')}`
      const { start: monthStart, endExclusive } = monthRange(ym)

      const budgetFilter = encodeURIComponent(`(userId='${auth.record.id}'&&year=${year}&&month=${month})`)
      const txnFilter = encodeURIComponent(`(date>='${monthStart}'&&date<'${endExclusive}'&&type='expense')`)

      const [budgetResponse, transactionResponse] = await Promise.all([
        axios.get(
          `${apiUrl}/collections/budgets/records?filter=${budgetFilter}`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        ).catch(() => ({ data: { items: [] } })),
        axios.get(
          `${apiUrl}/collections/transactions/records?filter=${txnFilter}&perPage=500`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        ),
      ])

      const txns = transactionResponse.data.items || []
      const categorySpent: { [key: string]: number } = {}
      txns.forEach((txn: any) => {
        const key = txn.category || 'Uncategorized'
        const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount
        categorySpent[key] = (categorySpent[key] || 0) + amount
      })

      setBudgets((budgetResponse.data.items || []).map((b: any) => ({
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

      if (editingId) {
        await axios.patch(
          `${apiUrl}/collections/budgets/records/${editingId}`,
          { category: formData.category.trim(), budgetAmount: amount },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        )
        toast.success('Budget updated')
      } else {
        await axios.post(
          `${apiUrl}/collections/budgets/records`,
          { category: formData.category.trim(), budgetAmount: amount, year, month, userId: auth.record.id },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        )
        toast.success('Budget set')
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-ink-400">Loading budget...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-lg">Budget</h1>
          <p className="mt-2 text-ink-400">Zero-based budgeting for {monthYear}</p>
        </div>
        <button
          onClick={() => (showForm ? setShowForm(false) : openNewBudget())}
          className="btn-primary py-2 px-4 shrink-0"
        >
          {showForm ? 'Cancel' : '+ Set Budget'}
        </button>
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
              <input
                type="text"
                list="budget-categories"
                placeholder="e.g., Groceries"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-base"
                disabled={!!editingId}
                required
              />
              <datalist id="budget-categories">
                {knownCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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
        <button onClick={handlePrevMonth} className="p-2 hover:bg-ink-700 rounded transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-normal min-w-[200px] text-center">{monthYear}</span>
        <button onClick={handleNextMonth} className="p-2 hover:bg-ink-700 rounded transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Budget Summary */}
      <div className="mt-8 card p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-body-sm text-ink-400">Budgeted</p>
            <p className="mt-1 text-2xl font-normal text-accent-sunset">${totalBudgeted.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-body-sm text-ink-400">Spent</p>
            <p className="mt-1 text-2xl font-normal text-accent-dusk">${totalSpent.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-body-sm text-ink-400">Remaining</p>
            <p className={`mt-1 text-2xl font-normal ${remaining >= 0 ? 'text-accent-breeze' : 'text-red-400'}`}>
              ${Math.abs(remaining).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <BudgetProgressBar spent={totalSpent} budgeted={totalBudgeted} />
        </div>
      </div>

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

              return (
                <div key={budget.id} className="card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-normal text-ink-50">{budget.categoryName}</p>
                      <p className="mt-1 text-body-sm text-ink-400">
                        ${spent.toFixed(2)} of ${budget.budgetAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
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
    </div>
  )
}
