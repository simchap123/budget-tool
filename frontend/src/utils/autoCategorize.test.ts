import { describe, it, expect } from 'vitest'
import { shouldContinue } from './autoCategorize'

// The driver loops the backend until the uncategorized queue drains, with two
// brakes against an infinite loop: no-progress and a hard iteration cap. These
// guard the termination logic (the only part that isn't network I/O).
describe('shouldContinue — auto-categorize loop termination', () => {
  it('stops when nothing remains, even if the last batch made progress', () => {
    expect(shouldContinue(40, 0, 1)).toBe(false)
  })

  it('stops when a batch makes no progress (updated === 0)', () => {
    // remaining > 0 but the backend couldn't place anything — keep looping and
    // it would spin forever, so we stop.
    expect(shouldContinue(0, 25, 1)).toBe(false)
  })

  it('stops once the hard iteration cap is reached', () => {
    expect(shouldContinue(10, 100, 60)).toBe(false) // at the cap → stop
    expect(shouldContinue(10, 100, 59)).toBe(true) // below the cap, still progressing → continue
  })

  it('continues while making progress and work remains under the cap', () => {
    expect(shouldContinue(40, 40, 1)).toBe(true)
    expect(shouldContinue(1, 5, 14)).toBe(true)
  })
})
