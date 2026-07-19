import { useState, useEffect } from 'react'
import axios from 'axios'
import { Repeat } from 'lucide-react'
import { detectRecurring, RecurringItem } from '../utils/recurring'
import { EmptyState } from '../components/ui/EmptyState'
import { formatShortDate } from '../utils/dateRange'

export function Recurring() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const since = new Date()
      since.setMonth(since.getMonth() - 6)
      const sinceStr = since.toISOString().slice(0, 10)
      const filter = encodeURIComponent(`(date>='${sinceStr}'&&type='expense')`)
      const res = await axios.get(
        `${apiUrl}/collections/transactions/records?perPage=500&filter=${filter}&sort=-date`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )
      setItems(detectRecurring(res.data.items || []))
    } catch (e) {
      console.error('Error loading recurring:', e)
    } finally {
      setLoading(false)
    }
  }

  const monthlyTotal = items.reduce((s, i) => s + i.monthlyEstimate, 0)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-ink-400">Finding recurring charges…</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div>
        <h1 className="text-display-lg">Recurring</h1>
        <p className="mt-2 text-ink-400">Subscriptions &amp; bills detected from your last 6 months</p>
      </div>

      <div className="mt-8 card p-6">
        <p className="text-body-sm text-ink-400">Estimated monthly recurring</p>
        <p className="mt-1 text-3xl font-normal text-accent-dusk">${monthlyTotal.toFixed(2)}</p>
        <p className="mt-1 text-body-sm text-ink-500">
          {items.length} recurring merchant{items.length === 1 ? '' : 's'} · ~${(monthlyTotal * 12).toFixed(0)}/yr
        </p>
      </div>

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState
            icon={<Repeat size={40} className="text-ink-500" />}
            title="No recurring charges found yet"
            description="Once you have a few months of transactions, subscriptions and bills that repeat with a consistent amount will show up here."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.key} className="card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-accent-dusk/15 text-accent-dusk shrink-0">
                    <Repeat size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-normal text-ink-50 truncate">{item.label}</p>
                    <p className="mt-1 text-body-sm text-ink-400">
                      {item.count}× · every ~{item.avgIntervalDays}d ·{' '}
                      <span className="text-accent-breeze">next ~{formatShortDate(item.nextDate)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-normal text-accent-dusk">${item.avgAmount.toFixed(2)}</p>
                  <p className="text-body-sm text-ink-500">/mo est.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
