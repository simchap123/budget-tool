import { useState, useEffect } from 'react'
import axios from 'axios'
import { Pencil, Trash2 } from 'lucide-react'
import { CSVImport } from '../components/CSVImport'
import { PlaidConnect } from '../components/PlaidConnect'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { trackTransactionAction } from '../utils/analytics'

export function Dashboard({ user }: { user: any }) {
  const toast = useToast()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({ amount: '', description: '', type: 'expense', category: '', date: new Date().toISOString().split('T')[0] })
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    fetchTransactions()
  }, [page, selectedMonth])

  const fetchTransactions = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      const monthStart = `${selectedMonth}-01`
      const monthEnd = new Date(selectedMonth + '-01')
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      const monthEndStr = monthEnd.toISOString().split('T')[0]

      const filter = `(date>='${monthStart}'&&date<='${monthEndStr}')`

      const response = await axios.get(
        `${apiUrl}/collections/transactions/records?perPage=25&page=${page}&filter=${encodeURIComponent(filter)}&sort=-date`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )
      setTransactions(response.data.items || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      if (editingId) {
        // Update existing transaction
        await axios.patch(
          `${apiUrl}/collections/transactions/records/${editingId}`,
          {
            amount: parseFloat(formData.amount),
            description: formData.description,
            type: formData.type,
            category: formData.category || 'Uncategorized',
            date: formData.date,
          },
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }
        )
        trackTransactionAction('edit', formData.type)
      } else {
        // Create new transaction
        await axios.post(
          `${apiUrl}/collections/transactions/records`,
          {
            amount: parseFloat(formData.amount),
            description: formData.description,
            type: formData.type,
            category: formData.category || 'Uncategorized',
            date: formData.date,
            userId: auth.record.id,
          },
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }
        )
        trackTransactionAction('add', formData.type)
      }

      setFormData({ amount: '', description: '', type: 'expense', category: '', date: new Date().toISOString().split('T')[0] })
      setFormOpen(false)
      setEditingId(null)
      await fetchTransactions()
    } catch (err: any) {
      console.error('Error saving transaction:', err)
      toast.error('Failed to save transaction: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      await axios.delete(
        `${apiUrl}/collections/transactions/records/${id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )

      trackTransactionAction('delete', 'expense')
      setShowDeleteConfirm(null)
      await fetchTransactions()
    } catch (err: any) {
      console.error('Error deleting transaction:', err)
      toast.error('Failed to delete transaction')
    }
  }

  const handleEditTransaction = (txn: any) => {
    setEditingId(txn.id)
    setFormData({
      amount: txn.amount.toString(),
      description: txn.description,
      type: txn.type,
      category: txn.category || 'Uncategorized',
      date: txn.date || new Date().toISOString().split('T')[0],
    })
    setFormOpen(true)
  }

  const calculateStats = () => {
    const income = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum, t: any) => {
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
        return sum + amount
      }, 0)
    const expenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum, t: any) => {
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
        return sum + amount
      }, 0)
    return { income, expenses, net: income - expenses }
  }

  const stats = calculateStats()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div>
        <h1 className="text-display-lg">Dashboard</h1>
        <p className="mt-2 text-ink-400">Welcome back, {user.name || user.email}</p>
      </div>

      {/* Month Selector */}
      <div className="mt-6 flex items-center gap-2">
        <label className="text-body-sm text-ink-400">Month:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value)
            setPage(1)
          }}
          className="input-base"
        />
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        <div className="card p-6">
          <p className="text-body-sm text-ink-400">Total Income</p>
          <p className="mt-2 text-3xl font-normal text-accent-sunset">${stats.income.toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <p className="text-body-sm text-ink-400">Total Expenses</p>
          <p className="mt-2 text-3xl font-normal text-accent-dusk">${stats.expenses.toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <p className="text-body-sm text-ink-400">Net Income</p>
          <p className="mt-2 text-3xl font-normal text-accent-breeze">${stats.net.toFixed(2)}</p>
        </div>
      </div>

      {/* Add Transaction Form */}
      <div className="mt-12">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-display-sm">Transactions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="btn-primary py-2 px-4"
            >
              {formOpen ? 'Cancel' : '+ Add Transaction'}
            </button>
            <PlaidConnect onSynced={fetchTransactions} />
            <button
              onClick={() => setImportOpen(!importOpen)}
              className="btn-secondary py-2 px-4"
            >
              {importOpen ? 'Cancel' : '📤 Import CSV'}
            </button>
          </div>
        </div>

        {importOpen && (
          <div className="mt-6">
            <CSVImport onImportComplete={() => {
              setImportOpen(false)
              fetchTransactions()
            }} />
          </div>
        )}

        {formOpen && (
          <div className="mt-6 card p-6">
            <h3 className="text-lg font-normal text-ink-50 mb-4">
              {editingId ? 'Edit Transaction' : 'Add New Transaction'}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-base"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Groceries"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Weekly shopping"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-base"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2"
              >
                {submitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Transaction' : 'Add Transaction')}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="mt-8">
        {loading ? (
          <SkeletonTable rows={8} cols={5} />
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No transactions yet"
            description="Start tracking your budget by adding your first transaction"
            action={{ label: '+ Add Transaction', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <div className="mt-6 overflow-x-auto rounded-sm border border-ink-700">
            <table className="table-minimal">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn: any) => (
                  <tr key={txn.id}>
                    <td className="text-ink-300">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td className="text-ink-300">{txn.description}</td>
                    <td className="text-ink-400">{txn.category || 'Uncategorized'}</td>
                    <td className="text-right">
                      <span className={txn.type === 'income' ? 'text-accent-sunset' : 'text-accent-dusk'}>
                        {txn.type === 'income' ? '+' : '-'}${txn.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="text-right space-x-1 sm:space-x-2 flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                      <button
                        onClick={() => handleEditTransaction(txn)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-body-sm font-normal bg-accent-sunset text-canvas rounded hover:bg-accent-sunset-soft transition-colors min-h-[32px]"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(txn.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-body-sm font-normal bg-accent-dusk text-canvas rounded hover:bg-purple-700 transition-colors min-h-[32px]"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {transactions.length > 0 && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Transaction?"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => handleDeleteTransaction(showDeleteConfirm!)}
              className="btn-primary flex-1 bg-accent-dusk hover:bg-purple-700"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-ink-300">
          Are you sure you want to delete this transaction? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
