import { describe, it, expect } from 'vitest'
import { parseCSVLine } from './csv'

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
