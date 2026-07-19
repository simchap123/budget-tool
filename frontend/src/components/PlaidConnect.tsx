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
    toast.success('Finishing bank connection — importing your full history…')
    const baseline = await countTransactions()
    let lastCount = baseline
    let quiet = 0
    // Chase's history (up to 24 months) loads in stages. Keep nudging /plaid/sync
    // and watch the count grow until it goes quiet (all history in) — up to ~4 min.
    for (let i = 0; i < 40 && quiet < 4; i++) {
      try { await axios.post(`${apiUrl}/plaid/sync`, {}, { headers: headers() }) } catch { /* PRODUCT_NOT_READY early — retry */ }
      const now = await countTransactions()
      if (now > lastCount) {
        lastCount = now
        quiet = 0
        onSynced() // refresh the dashboard as batches land
      } else {
        quiet++
      }
      if (quiet >= 4) break
      await new Promise((r) => setTimeout(r, 6000))
    }
    const total = baseline >= 0 && lastCount >= 0 ? lastCount - baseline : 0
    let connected = false
    try {
      const r = await axios.get(`${apiUrl}/plaid/status`, { headers: headers() })
      connected = !!r.data.connected
    } catch { /* unknown */ }
    if (total > 0) toast.success(`Imported ${total} transactions`)
    else if (connected) toast.info('Bank connected. Your transactions are still importing and will appear shortly.')
    else toast.error("The bank connection didn't finish. Please try Connect Bank again.")
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
