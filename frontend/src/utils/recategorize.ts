import axios from 'axios'

// After changing one transaction's category, offer to apply the same category to
// every OTHER transaction from the same merchant (matched server-side on the
// normalized merchant key, so different dates/codes still group). Returns how
// many additional rows were updated (0 if the user declined or there were none).
export async function propagateCategory(description: string, category: string): Promise<number> {
  const desc = String(description || '').trim()
  if (!desc || !category) return 0
  const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = { Authorization: `Bearer ${auth.token}` }
  try {
    const preview = await axios.post(`${apiUrl}/rpc/recategorize-similar`, { description: desc, category }, { headers })
    const others = (preview.data?.count || 0) - 1 // exclude the row already changed
    if (others > 0 && window.confirm(`Also change the other ${others} "${preview.data.key}" transaction${others === 1 ? '' : 's'} to "${category}"?`)) {
      const res = await axios.post(`${apiUrl}/rpc/recategorize-similar`, { description: desc, category, apply: true }, { headers })
      return res.data?.updated || 0
    }
  } catch {
    /* best-effort - the single row was already changed by the caller */
  }
  return 0
}
