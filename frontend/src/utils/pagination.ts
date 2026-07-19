// Builds the list of page tokens for the pager: page numbers plus '...' gaps,
// always showing the first and last page and a small window around the current one.
export function pageNumbers(page: number, totalPages: number, maxVisible = 5): (number | string)[] {
  const pages: (number | string)[] = []

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
    return pages
  }

  pages.push(1)
  if (page > 3) pages.push('...')

  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    if (!pages.includes(i)) pages.push(i)
  }

  if (page < totalPages - 2) pages.push('...')
  pages.push(totalPages)

  return pages
}
