import { describe, it, expect } from 'vitest'
import { timeAgo } from './timeAgo'

const NOW = Date.parse('2026-07-19T12:00:00.000Z')

describe('timeAgo', () => {
  it('says "just now" under a minute', () => {
    expect(timeAgo('2026-07-19T11:59:30.000Z', NOW)).toBe('just now')
  })
  it('reports minutes', () => {
    expect(timeAgo('2026-07-19T11:45:00.000Z', NOW)).toBe('15m ago')
  })
  it('reports hours', () => {
    expect(timeAgo('2026-07-19T09:00:00.000Z', NOW)).toBe('3h ago')
  })
  it('reports days', () => {
    expect(timeAgo('2026-07-17T12:00:00.000Z', NOW)).toBe('2d ago')
  })
  it('accepts PocketBase\'s space-separated format', () => {
    expect(timeAgo('2026-07-19 11:45:00.000Z', NOW)).toBe('15m ago')
  })
  it('returns empty for missing or unparseable input', () => {
    expect(timeAgo('', NOW)).toBe('')
    expect(timeAgo('not-a-date', NOW)).toBe('')
  })
  it('never returns a negative time for a slightly-future clock skew', () => {
    expect(timeAgo('2026-07-19T12:00:05.000Z', NOW)).toBe('just now')
  })
})
