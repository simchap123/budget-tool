interface AnalyticsEvent {
  id?: number
  timestamp: number
  eventType: string
  category: string
  userId: string
  value?: string | number
}

const DB_NAME = 'BudgetToolAnalytics'
const STORE_NAME = 'events'
const BATCH_SIZE = 10
let eventBatch: AnalyticsEvent[] = []
let db: IDBDatabase | null = null
let userId: string = ''

export async function initAnalytics(uid: string) {
  userId = uid
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      trackEvent('session', 'start')
      resolve()
    }
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export function trackEvent(eventType: string, category: string, value?: string | number) {
  if (!db) return

  const event: AnalyticsEvent = {
    timestamp: Date.now(),
    eventType,
    category,
    userId,
    value,
  }

  eventBatch.push(event)
  if (eventBatch.length >= BATCH_SIZE) {
    flushEvents()
  }
}

export function trackPageView(page: string) {
  trackEvent('page_view', 'navigation', page)
}

export function trackTransactionAction(action: 'add' | 'edit' | 'delete', type: string) {
  trackEvent('transaction_action', action, type)
}

export function trackImport(count: number) {
  trackEvent('csv_import', 'import', count)
}

export function flushEvents() {
  if (!db || eventBatch.length === 0) return

  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  eventBatch.forEach((event) => {
    store.add(event)
  })

  tx.onerror = () => console.error('Failed to save analytics events')
  eventBatch = []
}

export async function getAnalytics(days: number = 30): Promise<{
  totalTransactions: number
  totalImported: number
  avgMonthlySpend: number
  savingsRate: number
  dailyActivity: Array<{ date: string; count: number }>
  pageViews: Array<{ page: string; count: number }>
  topTransactionTypes: Array<{ type: string; count: number }>
}> {
  if (!db) return { totalTransactions: 0, totalImported: 0, avgMonthlySpend: 0, savingsRate: 0, dailyActivity: [], pageViews: [], topTransactionTypes: [] }

  return new Promise((resolve) => {
    const tx = db!.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const events = request.result as AnalyticsEvent[]
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

      const recentEvents = events.filter((e) => e.timestamp >= cutoffTime)

      const transactionCount = recentEvents.filter((e) => e.eventType === 'transaction_action' && e.category === 'add').length
      const importCount = recentEvents.filter((e) => e.eventType === 'csv_import').reduce((sum, e) => sum + (typeof e.value === 'number' ? e.value : 0), 0)

      const dailyMap: { [key: string]: number } = {}
      recentEvents.forEach((e) => {
        const date = new Date(e.timestamp).toISOString().split('T')[0]
        dailyMap[date] = (dailyMap[date] || 0) + 1
      })

      const pageViewMap: { [key: string]: number } = {}
      recentEvents.filter((e) => e.eventType === 'page_view').forEach((e) => {
        const page = String(e.value || 'unknown')
        pageViewMap[page] = (pageViewMap[page] || 0) + 1
      })

      const txnTypeMap: { [key: string]: number } = {}
      recentEvents.filter((e) => e.eventType === 'transaction_action').forEach((e) => {
        const type = e.value ? String(e.value) : e.category
        txnTypeMap[type] = (txnTypeMap[type] || 0) + 1
      })

      resolve({
        totalTransactions: transactionCount,
        totalImported: importCount,
        avgMonthlySpend: 0,
        savingsRate: 0,
        dailyActivity: Object.entries(dailyMap)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        pageViews: Object.entries(pageViewMap)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        topTransactionTypes: Object.entries(txnTypeMap)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      })
    }
  })
}

export function clearAnalytics() {
  if (!db) return
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.clear()
}

export function deleteOldEvents(days: number = 90) {
  if (!db) return

  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const request = store.getAll()

  request.onsuccess = () => {
    const events = request.result as AnalyticsEvent[]
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

    events.forEach((e) => {
      if (e.timestamp < cutoffTime && e.id) {
        store.delete(e.id)
      }
    })
  }
}

window.addEventListener('beforeunload', () => {
  flushEvents()
})
