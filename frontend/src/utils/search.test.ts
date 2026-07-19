import { describe, it, expect } from 'vitest'
import { filterTransactions } from './search'

const txns = [
  { description: 'POS DEBIT INSTACART', category: 'Grocery' },
  { description: 'OPTIMUM CABLE', category: 'Utilities' },
  { description: 'Zelle payment', category: 'Charity' },
]

describe('filterTransactions', () => {
  it('returns all when query is empty/whitespace', () => {
    expect(filterTransactions(txns, '   ')).toHaveLength(3)
  })
  it('matches on description, case-insensitive', () => {
    expect(filterTransactions(txns, 'instacart')).toEqual([txns[0]])
  })
  it('matches on category', () => {
    expect(filterTransactions(txns, 'utilities')).toEqual([txns[1]])
  })
  it('returns empty when nothing matches', () => {
    expect(filterTransactions(txns, 'zzz')).toEqual([])
  })
  it('tolerates missing fields', () => {
    expect(filterTransactions([{ description: 'x' }], 'x')).toHaveLength(1)
  })
})
