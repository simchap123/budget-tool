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
      const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8090/api`
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
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

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
          <p className="mt-2 text-3xl font-normal text-accent-sunset">$5,000</p>
        </div>
        <div className="card p-6">
          <p className="text-body-sm text-ink-400">Total Expenses</p>
          <p className="mt-2 text-3xl font-normal text-accent-dusk">$1,923</p>
        </div>
        <div className="card p-6">
          <p className="text-body-sm text-ink-400">Net Income</p>
          <p className="mt-2 text-3xl font-normal text-accent-breeze">$3,077</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-12">
        <h2 className="text-display-sm">Recent Transactions</h2>

        {loading ? (
          <p className="mt-4 text-ink-400">Loading transactions...</p>
        ) : error ? (
          <p className="mt-4 text-accent-dusk">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 text-ink-400">No transactions yet.</p>
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
