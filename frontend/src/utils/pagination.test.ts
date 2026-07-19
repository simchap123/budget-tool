import { describe, it, expect } from 'vitest'
import { pageNumbers } from './pagination'

describe('pageNumbers', () => {
  it('lists every page with no ellipsis when they fit within maxVisible', () => {
    expect(pageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageNumbers(3, 3)).toEqual([1, 2, 3])
  })

  it('shows a trailing ellipsis near the start', () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, '...', 10])
    expect(pageNumbers(2, 10)).toEqual([1, 2, 3, '...', 10])
  })

  it('shows a leading ellipsis near the end', () => {
    expect(pageNumbers(10, 10)).toEqual([1, '...', 9, 10])
    expect(pageNumbers(9, 10)).toEqual([1, '...', 8, 9, 10])
  })

  it('brackets the current page with ellipses in the middle', () => {
    expect(pageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
  })

  it('never duplicates the first or last page', () => {
    const pages = pageNumbers(3, 10)
    expect(pages).toEqual([1, 2, 3, 4, '...', 10])
    expect(pages.filter((p) => p === 1)).toHaveLength(1)
    expect(pages.filter((p) => p === 10)).toHaveLength(1)
  })
})
