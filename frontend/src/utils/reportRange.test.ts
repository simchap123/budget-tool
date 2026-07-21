import { describe, it, expect } from 'vitest'
import { resolveRange, yearsInRange } from './reportRange'

// Fixed "today" so the assertions are deterministic: 2026-07-20.
const TODAY = new Date(2026, 6, 20)

describe('resolveRange', () => {
  it('this-month spans the calendar month', () => {
    expect(resolveRange('this-month', TODAY)).toMatchObject({
      start: '2026-07-01',
      endExclusive: '2026-08-01',
    })
  })

  it('last-month is the previous calendar month', () => {
    expect(resolveRange('last-month', TODAY)).toMatchObject({
      start: '2026-06-01',
      endExclusive: '2026-07-01',
    })
  })

  it('last-3-months covers the 3 most recent months incl. this one', () => {
    expect(resolveRange('last-3-months', TODAY)).toMatchObject({
      start: '2026-05-01',
      endExclusive: '2026-08-01',
    })
  })

  it('last-12-months crosses the year boundary correctly', () => {
    expect(resolveRange('last-12-months', TODAY)).toMatchObject({
      start: '2025-08-01',
      endExclusive: '2026-08-01',
    })
  })

  it('this-year / last-year are calendar years', () => {
    expect(resolveRange('this-year', TODAY)).toMatchObject({ start: '2026-01-01', endExclusive: '2027-01-01' })
    expect(resolveRange('last-year', TODAY)).toMatchObject({ start: '2025-01-01', endExclusive: '2026-01-01' })
  })

  it('ytd runs from Jan 1 through today inclusive (exclusive end = tomorrow)', () => {
    expect(resolveRange('ytd', TODAY)).toMatchObject({ start: '2026-01-01', endExclusive: '2026-07-21' })
  })

  it('all-time is unbounded', () => {
    expect(resolveRange('all-time', TODAY)).toMatchObject({ start: '', endExclusive: '' })
  })

  it('custom makes the inclusive end exclusive by +1 day', () => {
    expect(resolveRange('custom', TODAY, '2026-03-01', '2026-03-31')).toMatchObject({
      start: '2026-03-01',
      endExclusive: '2026-04-01',
    })
  })

  it('custom with a missing bound falls back to all-time', () => {
    expect(resolveRange('custom', TODAY, '', '')).toMatchObject({ start: '', endExclusive: '' })
  })
})

describe('yearsInRange', () => {
  it('a full calendar year is ~1 year', () => {
    expect(yearsInRange('2025-01-01', '2026-01-01')).toBeCloseTo(1, 1)
  })

  it('a single calendar month is ~1/12 year', () => {
    expect(yearsInRange('2026-07-01', '2026-08-01')).toBeCloseTo(1 / 12, 1)
  })

  it('two full years is ~2', () => {
    expect(yearsInRange('2024-01-01', '2026-01-01')).toBeCloseTo(2, 1)
  })

  it('unbounded range falls back to the span of the given dates', () => {
    // Jan 2024 → Dec 2025 ≈ 2 years.
    expect(yearsInRange('', '', ['2024-01-15', '2025-12-15', '2024-06-01'])).toBeCloseTo(2, 0)
  })

  it('never returns zero, even with no dates', () => {
    expect(yearsInRange('', '', [])).toBe(1)
  })
})
