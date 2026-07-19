import { describe, it, expect } from 'vitest'
import { parseCSVLine, toCSV } from './csv'

describe('parseCSVLine', () => {
  it('splits simple comma-separated values', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })
  it('keeps commas that are inside quotes (real bank descriptions)', () => {
    expect(parseCSVLine('"07-17-2026","POS DEBIT, INSTACART, CA",130.05,expense')).toEqual([
      '07-17-2026',
      'POS DEBIT, INSTACART, CA',
      '130.05',
      'expense',
    ])
  })
  it('handles escaped double-quotes ("")', () => {
    expect(parseCSVLine('"she said ""hi""",ok')).toEqual(['she said "hi"', 'ok'])
  })
  it('trims surrounding whitespace of each field', () => {
    expect(parseCSVLine('  a , b ,c')).toEqual(['a', 'b', 'c'])
  })
  it('preserves empty trailing/middle fields', () => {
    expect(parseCSVLine('a,,c,')).toEqual(['a', '', 'c', ''])
  })
  it('handles a fully quoted single field with a comma', () => {
    expect(parseCSVLine('"Walmart, Inc"')).toEqual(['Walmart, Inc'])
  })
})

describe('toCSV', () => {
  const cols = ['Date', 'Description', 'Amount', 'Type', 'Category']

  it('writes a header and rows', () => {
    const out = toCSV([{ Date: '2026-07-01', Description: 'Coffee', Amount: 4.5, Type: 'expense', Category: 'Food' }], cols)
    expect(out).toBe('Date,Description,Amount,Type,Category\n2026-07-01,Coffee,4.5,expense,Food')
  })

  it('quotes fields containing commas and escapes quotes', () => {
    const out = toCSV([{ Date: '2026-07-01', Description: 'Walmart, "Superstore"', Amount: 20, Type: 'expense', Category: 'Shop' }], cols)
    expect(out.split('\n')[1]).toBe('2026-07-01,"Walmart, ""Superstore""",20,expense,Shop')
  })

  it('round-trips through parseCSVLine', () => {
    const row = { Date: '2026-07-01', Description: 'ZELLE, to A, B', Amount: 500, Type: 'expense', Category: 'Charity' }
    const line = toCSV([row], cols).split('\n')[1]
    expect(parseCSVLine(line)).toEqual(['2026-07-01', 'ZELLE, to A, B', '500', 'expense', 'Charity'])
  })

  it('emits just the header for empty input', () => {
    expect(toCSV([], cols)).toBe('Date,Description,Amount,Type,Category')
  })
})
