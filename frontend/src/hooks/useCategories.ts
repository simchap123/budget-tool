import { useState, useEffect } from 'react'
import { fetchAllRecords } from '../utils/fetchAll'

// The user's distinct categories, derived from their transactions (categories
// often live only as strings on transactions, not as category records). Cached
// module-wide so the dropdowns don't refetch on every mount.
let cache: string[] | null = null

export function useCategories(): string[] {
  const [cats, setCats] = useState<string[]>(cache || [])

  useEffect(() => {
    if (cache) return
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    fetchAllRecords(apiUrl, 'transactions', 'fields=category', { Authorization: `Bearer ${auth.token}` })
      .then((items) => {
        const list = Array.from(new Set(items.map((t: any) => t.category).filter(Boolean))).sort() as string[]
        cache = list
        setCats(list)
      })
      .catch(() => {})
  }, [])

  return cats
}

// Call after adding a category so the next mount refetches.
export function invalidateCategories() {
  cache = null
}
