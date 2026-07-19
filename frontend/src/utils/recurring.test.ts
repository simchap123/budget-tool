import { describe, it, expect } from 'vitest'
import { merchantKey } from './merchant'
import { detectRecurring, RawTxn } from './recurring'

describe('merchantKey', () => {
  it('extracts the merchant from noisy bank descriptions', () => {
    expect(merchantKey('OPTIMUM 7873 CABLE PMNT PPD ID: 9078730003')).toBe('OPTIMUM')
    expect(merchantKey('POS DEBIT IC* INSTACART +18882467822 CA 4654')).toBe('INSTACART')
  })
  it('groups the same merchant to the same key', () => {
    expect(merchantKey('OPTIMUM 7873 CABLE PMNT')).toBe(merchantKey('OPTIMUM CABLE JUL PAYMENT'))
  })
})

describe('detectRecurring', () => {
  const t = (description: string, amount: number, date: string): RawTxn => ({
    description, amount, type: 'expense', date: `${date} 00:00:00.000Z`,
  })

  it('detects a consistent monthly bill', () => {
    const items = detectRecurring([
      t('OPTIMUM CABLE PMNT', 157.11, '2026-05-15'),
      t('OPTIMUM CABLE PMNT', 157.11, '2026-06-15'),
      t('OPTIMUM CABLE PMNT', 157.11, '2026-07-15'),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].key).toBe('OPTIMUM')
    expect(items[0].count).toBe(3)
    expect(items[0].avgAmount).toBeCloseTo(157.11)
    // ~monthly cadence, next bill forecast about a month after the last
    expect(items[0].avgIntervalDays).toBeGreaterThanOrEqual(29)
    expect(items[0].avgIntervalDays).toBeLessThanOrEqual(32)
    expect(items[0].nextDate.startsWith('2026-08')).toBe(true)
    // cadence-aware estimate is ~the charge for a monthly bill (within a few %)
    expect(items[0].monthlyEstimate).toBeGreaterThan(150)
    expect(items[0].monthlyEstimate).toBeLessThan(162)
  })

  it('scales the monthly estimate for weekly cadence', () => {
    const items = detectRecurring([
      t('NETFLIX SUB', 10, '2026-07-01'),
      t('NETFLIX SUB', 10, '2026-07-08'),
      t('NETFLIX SUB', 10, '2026-07-15'),
      t('NETFLIX SUB', 10, '2026-08-01'),
    ])
    // ~weekly (7-day) interval -> roughly 4x the charge per month
    expect(items[0].avgIntervalDays).toBeLessThanOrEqual(11)
    expect(items[0].monthlyEstimate).toBeGreaterThan(25)
  })

  it('excludes variable spend at the same merchant (not consistent amounts)', () => {
    const items = detectRecurring([
      t('HATZLACHA GROCERY', 15.16, '2026-06-01'),
      t('HATZLACHA GROCERY', 220.0, '2026-07-01'),
    ])
    expect(items).toHaveLength(0)
  })

  it('excludes a one-off burst within a single month', () => {
    const items = detectRecurring([
      t('AMAZON PRIME', 4.99, '2026-07-01'),
      t('AMAZON PRIME', 4.99, '2026-07-20'),
    ])
    expect(items).toHaveLength(0)
  })

  it('de-dupes same-day charges so cadence/count are not inflated', () => {
    const items = detectRecurring([
      t('GYM MEMBERSHIP', 30, '2026-06-01'),
      t('GYM MEMBERSHIP', 30, '2026-06-01'), // same-day split charge
      t('GYM MEMBERSHIP', 30, '2026-07-01'),
      t('GYM MEMBERSHIP', 30, '2026-07-01'),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].count).toBe(2) // 2 distinct billing days, not 4
    expect(items[0].avgIntervalDays).toBeGreaterThanOrEqual(29)
    expect(items[0].avgIntervalDays).toBeLessThanOrEqual(31)
  })

  it('ignores income', () => {
    const items = detectRecurring([
      { description: 'PAYROLL DEP', amount: 2800, type: 'income', date: '2026-06-01' },
      { description: 'PAYROLL DEP', amount: 2800, type: 'income', date: '2026-07-01' },
    ])
    expect(items).toHaveLength(0)
  })

  it('sorts by monthly estimate descending', () => {
    const items = detectRecurring([
      t('OPTIMUM CABLE', 157.11, '2026-06-15'),
      t('OPTIMUM CABLE', 157.11, '2026-07-15'),
      t('GUARDIAN INSUR', 53.22, '2026-06-14'),
      t('GUARDIAN INSUR', 53.22, '2026-07-14'),
    ])
    expect(items.map((i) => i.key)).toEqual(['OPTIMUM', 'GUARDIAN'])
  })
})
