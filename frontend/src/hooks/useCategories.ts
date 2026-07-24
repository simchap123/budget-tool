import { useState, useEffect } from 'react'
import { fetchAllRecords } from '../utils/fetchAll'

// The user's category list. Two sources, merged and de-duplicated:
//   1. the `categories` collection - the canonical list the user maintains
//      (so brand-new categories show up before any transaction uses them);
//   2. distinct category strings already on their transactions (covers anything
//      imported that isn't in the collection yet).
// Cached module-wide so the dropdowns don't refetch on every mount.
let cache: string[] | null = null

export function useCategories(): string[] {
  const [cats, setCats] = useState<string[]>(cache || [])

  useEffect(() => {
    if (cache) return
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    const headers = { Authorization: `Bearer ${auth.token}` }
    Promise.all([
      fetchAllRecords(apiUrl, 'categories', 'fields=name', headers).catch(() => []),
      fetchAllRecords(apiUrl, 'transactions', 'fields=category', headers).catch(() => []),
    ])
      .then(([cols, txns]) => {
        const names = [
          ...cols.map((c: any) => c.name),
          ...txns.map((t: any) => t.category),
        ]
        const list = Array.from(new Set(names.filter(Boolean))).sort() as string[]
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
