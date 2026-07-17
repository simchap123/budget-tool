import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react'
import { getAnalytics } from '../utils/analytics'

export function Analytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadAnalytics()
  }, [days])

  const loadAnalytics = async () => {
    setLoading(true)
    const analyticsData = await getAnalytics(days)
    setData(analyticsData)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-ink-400">Loading analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-display-lg">Analytics</h1>
        <p className="mt-2 text-ink-400">No analytics data available yet</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div>
        <h1 className="text-display-lg">Analytics</h1>
        <p className="mt-2 text-ink-400">Track your budgeting behavior and insights</p>
      </div>

      {/* Time Period Selector */}
      <div className="mt-6 flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-sm text-body-sm font-normal transition-colors ${
              days === d
                ? 'bg-accent-sunset text-canvas'
                : 'bg-ink-700 text-ink-200 hover:bg-ink-600'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-accent-sunset" />
            <p className="text-body-sm text-ink-400">Transactions</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-accent-sunset">{data.totalTransactions}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-accent-breeze" />
            <p className="text-body-sm text-ink-400">Imported</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-accent-breeze">{data.totalImported}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-accent-dusk" />
            <p className="text-body-sm text-ink-400">Avg Daily</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-accent-dusk">
            {data.dailyActivity.length > 0
              ? (data.totalTransactions / Math.max(data.dailyActivity.length, 1)).toFixed(1)
              : '0'}
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <TrendingDown size={20} className="text-accent-twilight" />
            <p className="text-body-sm text-ink-400">Pages Visited</p>
          </div>
          <p className="mt-2 text-3xl font-normal text-accent-twilight">{data.pageViews.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-12 grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Daily Activity Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-normal text-ink-50 mb-4">Daily Activity</h3>
          {data.dailyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" />
                <XAxis dataKey="date" stroke="#888" style={{ fontSize: '12px' }} />
                <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '4px' }}
                  labelStyle={{ color: '#d4d4d4' }}
                />
                <Line type="monotone" dataKey="count" stroke="#f97316" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-ink-400">No data yet</div>
          )}
        </div>

        {/* Page Views Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-normal text-ink-50 mb-4">Top Pages</h3>
          {data.pageViews.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.pageViews}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" />
                <XAxis dataKey="page" stroke="#888" style={{ fontSize: '12px' }} />
                <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '4px' }}
                  labelStyle={{ color: '#d4d4d4' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-ink-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Top Transaction Types Table */}
      {data.topTransactionTypes.length > 0 && (
        <div className="mt-8 card p-6">
          <h3 className="text-lg font-normal text-ink-50 mb-4">Top Actions</h3>
          <div className="overflow-x-auto rounded-sm border border-ink-700">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-ink-700">
                  <th className="px-4 py-2 text-left text-ink-300">Action</th>
                  <th className="px-4 py-2 text-right text-ink-300">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.topTransactionTypes.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-ink-700">
                    <td className="px-4 py-2 text-ink-300">{item.type}</td>
                    <td className="px-4 py-2 text-right text-ink-200">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
