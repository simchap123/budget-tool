import { useState, useEffect } from 'react'
import axios from 'axios'
import { Landmark } from 'lucide-react'
import { useToast } from './ui/Toast'

// Uses Plaid Hosted Link: "Connect Bank" redirects to a Plaid-hosted page that
// handles the whole flow (including Chase OAuth) with no embedded JS or cache
// issues. Plaid delivers the result via webhook (backend exchanges + syncs);
// on return we poll /sync until the new transactions land.
export function PlaidConnect({ onSynced }: { onSynced: () => void }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('plaid') === 'done') {
      window.history.replaceState({}, '', window.location.pathname)
      pollSync()
    }
  }, [])

  const countTransactions = async (): Promise<number> => {
    try {
      const r = await axios.get(`${apiUrl}/collections/transactions/records?perPage=1`, { headers: headers() })
      return r.data.totalItems ?? 0
    } catch {
      return -1
    }
  }

  // The webhook creates the item and syncs server-side. Big histories (e.g. Chase)
  // arrive asynchronously via SYNC_UPDATES_AVAILABLE, often after the redirect —
  // so nudge a sync early, then watch the transaction count grow for ~90s (cheap
  // local checks, not repeated Plaid calls) and refresh the moment they land.
  const pollSync = async () => {
    setLoading(true)
    toast.success('Finishing bank connection — importing transactions…')
    const baseline = await countTransactions()
    for (let i = 0; i < 18; i++) {
      if (i < 5) {
        try { await axios.post(`${apiUrl}/plaid/sync`, {}, { headers: headers() }) } catch { /* webhook may still be running */ }
      }
      const now = await countTransactions()
      if (baseline >= 0 && now > baseline) {
        toast.success(`Imported ${now - baseline} transactions`)
        onSynced()
        setLoading(false)
        return
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
    toast.info('Bank connected. Your transactions are still importing and will appear shortly.')
    onSynced()
    setLoading(false)
  }

  const connect = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${apiUrl}/plaid/create-hosted-link`, {}, { headers: headers() })
      if (data.hosted_link_url) {
        window.location.href = data.hosted_link_url
      } else {
        throw new Error(data.error || 'Could not start Plaid')
      }
    } catch (e: any) {
      toast.error('Could not start Plaid: ' + (e.response?.data?.error || e.message))
      setLoading(false)
    }
  }

  return (
    <button
      onClick={connect}
      disabled={loading}
      className="btn-secondary py-2 px-4 inline-flex items-center gap-2 disabled:opacity-50"
    >
      <Landmark size={16} /> {loading ? 'Connecting…' : 'Connect Bank'}
    </button>
  )
}
