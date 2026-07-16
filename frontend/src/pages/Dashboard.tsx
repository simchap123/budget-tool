import { useState, useEffect } from 'react'
import axios from 'axios'

export function Dashboard({ user }: { user: any }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8090'}/api/collections/transactions/records`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )
      setTransactions(response.data.items || [])
    } catch (err: any) {
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
      <p className="mt-2 text-neutral-600">Welcome back, {user.name || user.email}</p>

      {/* Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6">
          <p className="text-sm text-neutral-600">Total Income</p>
          <p className="mt-2 text-3xl font-bold text-success-600">$5,000</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-neutral-600">Total Expenses</p>
          <p className="mt-2 text-3xl font-bold text-danger-600">$1,923</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-neutral-600">Net Income</p>
          <p className="mt-2 text-3xl font-bold text-primary-600">$3,077</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-neutral-900">Recent Transactions</h2>

        {loading ? (
          <p className="mt-4 text-neutral-600">Loading transactions...</p>
        ) : error ? (
          <p className="mt-4 text-danger-600">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 text-neutral-600">No transactions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn: any) => (
                  <tr key={txn.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-neutral-900">
                      {new Date(txn.created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900">{txn.description}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{txn.category || 'Uncategorized'}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900">
                      {txn.type === 'income' ? '+' : '-'}${txn.amount.toFixed(2)}
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
