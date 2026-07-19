export interface SearchableTxn {
  description?: string
  category?: string
}

// Case-insensitive filter over a transaction's description + category.
export function filterTransactions<T extends SearchableTxn>(txns: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return txns
  return txns.filter((t) =>
    `${t.description || ''} ${t.category || ''}`.toLowerCase().includes(q)
  )
}
