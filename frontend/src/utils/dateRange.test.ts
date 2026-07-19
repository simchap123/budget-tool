import { describe, it, expect } from 'vitest'
import { monthRange, monthLabel, shiftMonth, normalizeDate } from './dateRange'

describe('monthRange', () => {
  it('returns an inclusive start and exclusive next-month end', () => {
    expect(monthRange('2026-07')).toEqual({ start: '2026-07-01', endExclusive: '2026-08-01' })
  })
  it('rolls over the year in December', () => {
    expect(monthRange('2025-12')).toEqual({ start: '2025-12-01', endExclusive: '2026-01-01' })
  })
  it('regression: end must never equal start (the timezone bug)', () => {
    const { start, endExclusive } = monthRange('2026-07')
    expect(endExclusive).not.toBe(start)
    expect(endExclusive > start).toBe(true)
  })
})

describe('monthLabel', () => {
  it('renders a human month/year without shifting a day', () => {
    expect(monthLabel('2026-07')).toBe('July 2026')
    expect(monthLabel('2026-01')).toBe('January 2026')
    expect(monthLabel('2025-12')).toBe('December 2025')
  })
})

describe('shiftMonth', () => {
  it('moves forward and backward across boundaries', () => {
    expect(shiftMonth('2026-07', -1)).toBe('2026-06')
    expect(shiftMonth('2026-07', 1)).toBe('2026-08')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(shiftMonth('2026-06', 12)).toBe('2027-06')
  })
})

describe('normalizeDate', () => {
  it('keeps ISO YYYY-MM-DD', () => {
    expect(normalizeDate('2026-07-17')).toBe('2026-07-17 00:00:00.000Z')
  })
  it('converts MM-DD-YYYY (e.g. Chase exports)', () => {
    expect(normalizeDate('07-17-2026')).toBe('2026-07-17 00:00:00.000Z')
  })
  it('converts MM/DD/YYYY', () => {
    expect(normalizeDate('7/5/2026')).toBe('2026-07-05 00:00:00.000Z')
  })
  it('pads single-digit month/day', () => {
    expect(normalizeDate('2026-7-5')).toBe('2026-07-05 00:00:00.000Z')
  })
  it('produces a filterable value that sits inside its month range', () => {
    const d = normalizeDate('07-17-2026')
    const { start, endExclusive } = monthRange('2026-07')
    expect(d >= start && d < endExclusive).toBe(true)
  })
})
