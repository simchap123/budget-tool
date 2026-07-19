import { useState, useEffect } from 'react'
import axios from 'axios'
import { Landmark, AlertTriangle } from 'lucide-react'
import { useToast } from './ui/Toast'

// Uses Plaid Hosted Link: "Connect Bank" redirects to a Plaid-hosted page that
// handles the whole flow (including Chase OAuth) with no embedded JS or cache
// issues. Plaid delivers the result via webhook (backend exchanges + syncs);
// on return we poll /sync until the new transactions land.
export function PlaidConnect({ onSynced }: { onSynced: () => void }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [chaseDegraded, setChaseDegraded] = useState(false)

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
    // Surface Chase's live login health so a Chase-side outage reads as such,
    // not as a broken app (Chase's OAuth 500s when its status is DEGRADED).
    axios
      .get(`${apiUrl}/plaid/bank-status`, { headers: headers() })
      .then((r) => setChaseDegraded(!!r.data.degraded))
      .catch(() => {})
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
    // Window elapsed with no new transactions — distinguish "connected but still
    // importing" from "the connection never completed" so the message is honest.
    let connected = false
    try {
      const r = await axios.get(`${apiUrl}/plaid/status`, { headers: headers() })
      connected = !!r.data.connected
    } catch { /* treat as unknown/failed below */ }
    if (connected) {
      toast.info('Bank connected. Your transactions are still importing and will appear shortly.')
    } else {
      toast.error("The bank connection didn't finish. Please try Connect Bank again.")
    }
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
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={connect}
        disabled={loading}
        className="btn-secondary py-2 px-4 inline-flex items-center gap-2 disabled:opacity-50"
      >
        <Landmark size={16} /> {loading ? 'Connecting…' : 'Connect Bank'}
      </button>
      {chaseDegraded && (
        <span className="inline-flex items-center gap-1 text-body-sm text-yellow-400 max-w-xs">
          <AlertTriangle size={13} className="shrink-0" />
          Chase logins are temporarily degraded (Plaid status) — connecting may fail; try again later.
        </span>
      )}
    </div>
  )
}
