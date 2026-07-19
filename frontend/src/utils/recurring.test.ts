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
