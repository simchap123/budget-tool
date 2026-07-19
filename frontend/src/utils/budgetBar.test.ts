import { describe, it, expect } from 'vitest'
import { budgetPercent, budgetBarColor } from './budgetBar'

describe('budgetPercent', () => {
  it('computes the spent share of the budget', () => {
    expect(budgetPercent(50, 200)).toBe(25)
    expect(budgetPercent(200, 200)).toBe(100)
  })
  it('clamps overspending to 100', () => {
    expect(budgetPercent(500, 200)).toBe(100)
  })
  it('reads a zero (unset) budget as 0% instead of dividing by zero', () => {
    expect(budgetPercent(100, 0)).toBe(0)
    expect(budgetPercent(0, 0)).toBe(0)
  })
})

describe('budgetBarColor', () => {
  const base = '#ff7a17'
  it('uses the base color well under budget', () => {
    expect(budgetBarColor(50, base)).toBe(base)
    expect(budgetBarColor(89.9, base)).toBe(base)
  })
  it('turns amber in the last 10% before the limit', () => {
    expect(budgetBarColor(90, base)).toBe('#fbbf24')
    expect(budgetBarColor(99, base)).toBe('#fbbf24')
  })
  it('turns red at or over the limit', () => {
    expect(budgetBarColor(100, base)).toBe('#f87171')
  })
})
