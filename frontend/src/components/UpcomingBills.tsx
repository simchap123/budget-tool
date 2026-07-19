import { useState, useEffect } from 'react'
import { CalendarClock } from 'lucide-react'
import { detectRecurring, upcomingBills, RecurringItem } from '../utils/recurring'
import { formatShortDate } from '../utils/dateRange'
import { fetchAllRecords } from '../utils/fetchAll'

// Compact Dashboard widget: recurring bills expected in the next ~3 weeks.
// Renders nothing when there's nothing due (keeps the Dashboard uncluttered).
export function UpcomingBills() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const since = new Date()
      since.setMonth(since.getMonth() - 6)
      const sinceStr = since.toISOString().slice(0, 10)
      const filter = encodeURIComponent(`(date>='${sinceStr}'&&type='expense')`)
      const items = await fetchAllRecords(apiUrl, 'transactions', `filter=${filter}&sort=-date`, {
        Authorization: `Bearer ${auth.token}`,
      })
      const recurring = detectRecurring(items)
      const today = new Date().toISOString().slice(0, 10)
      setItems(upcomingBills(recurring, today, 21).slice(0, 5))
    } catch {
      /* best-effort widget */
    } finally {
      setLoading(false)
    }
  }

  if (loading || items.length === 0) return null

  const total = items.reduce((s, i) => s + i.avgAmount, 0)

  return (
    <div className="mt-6 card p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={18} className="text-accent-breeze" />
        <h3 className="text-lg font-normal text-ink-50">Upcoming bills</h3>
        <span className="text-body-sm text-ink-500">· next 3 weeks · ~${total.toFixed(2)}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <p className="text-body-sm text-ink-300 truncate">{item.label}</p>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-body-sm text-accent-breeze">~{formatShortDate(item.nextDate)}</span>
              <span className="text-body-sm text-ink-200 w-20 text-right">${item.avgAmount.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
