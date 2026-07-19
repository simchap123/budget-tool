import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Percent, ChevronLeft, ChevronRight } from 'lucide-react'
import { monthRange } from '../utils/dateRange'

export function Reports() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'month' | 'year'>('month')
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchTransactions()
  }, [filterType, currentMonth, currentYear])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      let filter = ''
      if (filterType === 'month') {
        const { start, endExclusive } = monthRange(currentMonth)
        filter = `(date>='${start}'&&date<'${endExclusive}')`
      } else {
        const yearStart = `${currentYear}-01-01`
        const yearEndExclusive = `${currentYear + 1}-01-01`
        filter = `(date>='${yearStart}'&&date<'${yearEndExclusive}')`
      }

      const response = await axios.get(
        `${apiUrl}/collections/transactions/records?perPage=500&filter=${encodeURIComponent(filter)}`,
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
      const date = new Date(txn.date)
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
        income: data.income,
        expense: data.expense,
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

    return {
      income,
      expense,
      net: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
      count: transactions.length,
    }
  }

  const categoryStats = getCategoryStats()
  const trendData = getTrendData()
  const totals = getTotals()

  const expenseChartData = categoryStats
    .filter((c) => c.expense > 0)
    .sort((a, b) => b.expense - a.expense)
    .slice(0, 8)
    .map((cat) => ({
      name: cat.name,
      value: cat.expense,
    }))

  const COLORS = ['#f97316', '#06b6d4', '#10b981', '#eab308', '#a855f7', '#ec4899', '#3b82f6', '#f59e0b']

  const handlePrevMonth = () => {
    const date = new Date(currentMonth)
    date.setMonth(date.getMonth() - 1)
    setCurrentMonth(date.toISOString().slice(0, 7))
  }

  const handleNextMonth = () => {
    const date = new Date(currentMonth)
    date.setMonth(date.getMonth() + 1)
    setCurrentMonth(date.toISOString().slice(0, 7))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-ink-400">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div>
        <h1 className="text-display-lg">Reports</h1>
        <p className="mt-2 text-ink-400">Financial overview and insights</p>
      </div>

      {/* Filter Buttons */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('month')}
            className={`px-4 py-2 rounded-sm text-body-sm font-normal transition-colors ${
              filterType === 'month'
                ? 'bg-accent-sunset text-canvas'
                : 'bg-ink-700 text-ink-200 hover:bg-ink-600'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setFilterType('year')}
            className={`px-4 py-2 rounded-sm text-body-sm font-normal transition-colors ${
              filterType === 'year'
                ? 'bg-accent-sunset text-canvas'
                : 'bg-ink-700 text-ink-200 hover:bg-ink-600'
            }`}
          >
            Year
          </button>
        </div>

        {filterType === 'month' && (
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-ink-700 rounded transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-body-md min-w-[150px] text-center">
              {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-ink-700 rounded transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {filterType === 'year' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentYear(currentYear - 1)}
              className="p-1 hover:bg-ink-700 rounded transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-body-md min-w-[100px] text-center">{currentYear}</span>
            <button
              onClick={() => setCurrentYear(currentYear + 1)}
              className="p-1 hover:bg-ink-700 rounded transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-accent-sunset" />
            <p className="text-body-sm text-ink-400">Income</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-accent-sunset">${totals.income.toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <TrendingDown size={20} className="text-accent-dusk" />
            <p className="text-body-sm text-ink-400">Expenses</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-accent-dusk">${totals.expense.toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-accent-breeze" />
            <p className="text-body-sm text-ink-400">Net</p>
          </div>
          <p className={`mt-2 text-3xl font-normal ${totals.net >= 0 ? 'text-accent-breeze' : 'text-red-400'}`}>
            ${totals.net.toFixed(2)}
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Percent size={20} className="text-accent-twilight" />
            <p className="text-body-sm text-ink-400">Savings Rate</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-accent-twilight">{totals.savingsRate.toFixed(1)}%</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-ink-400" />
            <p className="text-body-sm text-ink-400">Transactions</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-ink-200">{totals.count}</p>
        </div>
      </div>

      {/* Charts */}
      {trendData.length > 0 && (
        <div className="mt-12 grid gap-8 grid-cols-1 lg:grid-cols-2">
          {/* Monthly Trend Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-normal text-ink-50 mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" />
                <XAxis dataKey="month" stroke="#888" style={{ fontSize: '12px' }} />
                <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '4px' }}
                  labelStyle={{ color: '#d4d4d4' }}
                />
                <Legend />
                <Bar dataKey="income" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown Chart */}
          {expenseChartData.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-normal text-ink-50 mb-4">Expense by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '4px' }}
                    labelStyle={{ color: '#d4d4d4' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Category Breakdown Table */}
      <div className="mt-12">
        <h2 className="text-display-sm mb-6">Category Details</h2>
        {categoryStats.length > 0 ? (
          <div className="overflow-x-auto rounded-sm border border-ink-700">
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
                {categoryStats.map((cat) => (
                  <tr key={cat.name}>
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
        ) : (
          <div className="card p-12 text-center">
            <p className="text-ink-400">No transactions in the selected period</p>
          </div>
        )}
      </div>
    </div>
  )
}
