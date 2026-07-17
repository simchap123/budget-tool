import { useState, useEffect } from 'react'
import axios from 'axios'

export function Reports() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const response = await axios.get(
        `${apiUrl}/collections/transactions/records?perPage=500`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )
      setTransactions(response.data.items || [])
    } catch (err) {
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryStats = () => {
    const stats: { [key: string]: { income: number; expense: number; count: number } } = {}

    transactions.forEach((txn: any) => {
      const category = txn.category || 'Uncategorized'
      if (!stats[category]) {
        stats[category] = { income: 0, expense: 0, count: 0 }
      }
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount
      if (txn.type === 'income') {
        stats[category].income += amount
      } else {
        stats[category].expense += amount
      }
      stats[category].count += 1
    })

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      net: data.income - data.expense,
    }))
  }

  const getTrendData = () => {
    const byMonth: { [key: string]: { income: number; expense: number } } = {}

    transactions.forEach((txn: any) => {
      const date = new Date(txn.created)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { income: 0, expense: 0 }
      }

      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount
      if (txn.type === 'income') {
        byMonth[monthKey].income += amount
      } else {
        byMonth[monthKey].expense += amount
      }
    })

    return Object.entries(byMonth)
      .sort()
      .map(([month, data]) => ({
        month,
        ...data,
        net: data.income - data.expense,
      }))
  }

  const getTotals = () => {
    const income = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum, t: any) => sum + (typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount), 0)
    const expense = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum, t: any) => sum + (typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount), 0)

    return { income, expense, net: income - expense, count: transactions.length }
  }

  const categoryStats = getCategoryStats()
  const trendData = getTrendData()
  const totals = getTotals()

  if (loading) {
    return <div className="text-center py-8 text-ink-400">Loading reports...</div>
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-display-lg">Reports & Analytics</h1>
        <p className="mt-2 text-ink-400">Financial overview and insights</p>
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-4">
        <div className="card p-6 border-l-4 border-accent-breeze">
          <p className="text-body-sm text-ink-400">📊 Total Transactions</p>
          <p className="mt-3 text-4xl font-bold text-accent-breeze">{totals.count}</p>
        </div>
        <div className="card p-6 border-l-4 border-accent-sunset">
          <p className="text-body-sm text-ink-400">📈 Total Income</p>
          <p className="mt-3 text-4xl font-bold text-accent-sunset">${totals.income.toFixed(2)}</p>
        </div>
        <div className="card p-6 border-l-4 border-accent-dusk">
          <p className="text-body-sm text-ink-400">📉 Total Expenses</p>
          <p className="mt-3 text-4xl font-bold text-accent-dusk">${totals.expense.toFixed(2)}</p>
        </div>
        <div className={`card p-6 border-l-4 ${totals.net >= 0 ? 'border-accent-breeze' : 'border-accent-dusk'}`}>
          <p className="text-body-sm text-ink-400">💰 Net Income</p>
          <p className={`mt-3 text-4xl font-bold ${totals.net >= 0 ? 'text-accent-breeze' : 'text-accent-dusk'}`}>
            ${totals.net.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-accent-sunset to-accent-dusk rounded"></div>
          <h2 className="text-display-sm">📊 Category Breakdown</h2>
        </div>
        <div className="mt-6 overflow-x-auto rounded-sm border border-ink-700 border-t-4 border-t-accent-sunset">
          <table className="table-minimal">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Transactions</th>
                <th className="text-right">Income</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((cat, idx) => (
                <tr key={cat.name} className={idx % 2 === 0 ? 'bg-canvas-card' : ''}>
                  <td className="text-ink-300 font-medium">{cat.name}</td>
                  <td className="text-right">
                    <span className="inline-block px-2 py-1 bg-accent-breeze text-canvas text-body-sm rounded-full font-medium">
                      {cat.count}
                    </span>
                  </td>
                  <td className="text-right text-accent-sunset font-medium">${cat.income.toFixed(2)}</td>
                  <td className="text-right text-accent-dusk font-medium">${cat.expense.toFixed(2)}</td>
                  <td className={`text-right font-bold ${cat.net >= 0 ? 'text-accent-breeze' : 'text-accent-dusk'}`}>
                    ${cat.net.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trend */}
      {trendData.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-accent-breeze to-accent-sunset rounded"></div>
            <h2 className="text-display-sm">📈 Monthly Trend</h2>
          </div>
          <div className="mt-6 overflow-x-auto rounded-sm border border-ink-700 border-t-4 border-t-accent-breeze">
            <table className="table-minimal">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="text-right">Income</th>
                  <th className="text-right">Expenses</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((trend, idx) => (
                  <tr key={trend.month} className={idx % 2 === 0 ? 'bg-canvas-card' : ''}>
                    <td className="text-ink-300 font-medium">{trend.month}</td>
                    <td className="text-right text-accent-sunset font-medium">${trend.income.toFixed(2)}</td>
                    <td className="text-right text-accent-dusk font-medium">${trend.expense.toFixed(2)}</td>
                    <td className={`text-right font-bold ${trend.net >= 0 ? 'text-accent-breeze' : 'text-accent-dusk'}`}>
                      ${trend.net.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {transactions.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-ink-400">No transactions yet. Add some transactions to see reports.</p>
        </div>
      )}
    </div>
  )
}
