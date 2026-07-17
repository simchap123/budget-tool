import { useState, useEffect } from 'react'
import axios from 'axios'

export function Dashboard({ user }: { user: any }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState({ amount: '', description: '', type: 'expense', category: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const response = await axios.get(
        `${apiUrl}/collections/transactions/records`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )
      setTransactions(response.data.items || [])
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

      await axios.post(
        `${apiUrl}/collections/transactions/records`,
        {
          amount: parseFloat(formData.amount),
          description: formData.description,
          type: formData.type,
          category: formData.category || 'Uncategorized',
          userId: auth.record.id,
        },
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )

      setFormData({ amount: '', description: '', type: 'expense', category: '' })
      setFormOpen(false)
      await fetchTransactions()
    } catch (err: any) {
      console.error('Error adding transaction:', err)
      alert('Failed to add transaction: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const calculateStats = () => {
    const income = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum, t: any) => sum + (t.amount || 0), 0)
    const expenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum, t: any) => sum + (t.amount || 0), 0)
    return { income, expenses, net: income - expenses }
  }

  const stats = calculateStats()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-display-lg">Dashboard</h1>
        <p className="mt-2 text-ink-400">Welcome back, {user.name || user.email}</p>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
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
        <div className="flex items-center justify-between">
          <h2 className="text-display-sm">Transactions</h2>
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="btn-primary py-2 px-4"
          >
            {formOpen ? 'Cancel' : '+ Add Transaction'}
          </button>
        </div>

        {formOpen && (
          <div className="mt-6 card p-6">
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                {submitting ? 'Adding...' : 'Add Transaction'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="mt-8">
        {loading ? (
          <p className="mt-4 text-ink-400">Loading transactions...</p>
        ) : error ? (
          <p className="mt-4 text-accent-dusk">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 text-ink-400">No transactions yet. Click "Add Transaction" to get started!</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-sm border border-ink-700">
            <table className="table-minimal">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn: any) => (
                  <tr key={txn.id}>
                    <td className="text-ink-300">
                      {new Date(txn.created).toLocaleDateString()}
                    </td>
                    <td className="text-ink-300">{txn.description}</td>
                    <td className="text-ink-400">{txn.category || 'Uncategorized'}</td>
                    <td className="text-right">
                      <span className={txn.type === 'income' ? 'text-accent-sunset' : 'text-accent-dusk'}>
                        {txn.type === 'income' ? '+' : '-'}${txn.amount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
