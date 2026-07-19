import { describe, it, expect } from 'vitest'
import { summarizeEvents } from './analytics'

const NOW = Date.parse('2026-07-19T12:00:00.000Z')
const daysAgo = (n: number) => NOW - n * 24 * 60 * 60 * 1000

describe('summarizeEvents', () => {
  it('counts added transactions within the window and excludes older ones', () => {
    const events = [
      { timestamp: daysAgo(1), eventType: 'transaction_action', category: 'add', userId: 'u' },
      { timestamp: daysAgo(2), eventType: 'transaction_action', category: 'add', userId: 'u' },
      { timestamp: daysAgo(2), eventType: 'transaction_action', category: 'delete', userId: 'u' },
      { timestamp: daysAgo(40), eventType: 'transaction_action', category: 'add', userId: 'u' }, // outside 30d
    ]
    const s = summarizeEvents(events, 30, NOW)
    expect(s.totalTransactions).toBe(2)
  })

  it('sums csv_import values', () => {
    const events = [
      { timestamp: daysAgo(1), eventType: 'csv_import', category: '', userId: 'u', value: 100 },
      { timestamp: daysAgo(3), eventType: 'csv_import', category: '', userId: 'u', value: 50 },
    ]
    expect(summarizeEvents(events, 30, NOW).totalImported).toBe(150)
  })

  it('builds page-view counts sorted by frequency', () => {
    const events = [
      { timestamp: daysAgo(1), eventType: 'page_view', category: '', userId: 'u', value: 'dashboard' },
      { timestamp: daysAgo(1), eventType: 'page_view', category: '', userId: 'u', value: 'dashboard' },
      { timestamp: daysAgo(1), eventType: 'page_view', category: '', userId: 'u', value: 'reports' },
    ]
    const pv = summarizeEvents(events, 30, NOW).pageViews
    expect(pv[0]).toEqual({ page: 'dashboard', count: 2 })
    expect(pv[1]).toEqual({ page: 'reports', count: 1 })
  })

  it('returns empty aggregates for no events', () => {
    const s = summarizeEvents([], 30, NOW)
    expect(s.totalTransactions).toBe(0)
    expect(s.dailyActivity).toEqual([])
    expect(s.pageViews).toEqual([])
    expect(s.topTransactionTypes).toEqual([])
  })
})
