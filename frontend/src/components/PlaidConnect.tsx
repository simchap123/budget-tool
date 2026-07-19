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

  // The webhook creates the item + does the first sync; poll a few times in case
  // the redirect beats the webhook, then refresh the dashboard.
  const pollSync = async () => {
    setLoading(true)
    toast.success('Finishing bank connection — syncing…')
    for (let i = 0; i < 8; i++) {
      try {
        const res = await axios.post(`${apiUrl}/plaid/sync`, {}, { headers: headers() })
        if (res.data.added > 0) {
          toast.success(`Synced ${res.data.added} transactions`)
          onSynced()
          setLoading(false)
          return
        }
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, 3000))
    }
    toast.info('Bank connected. Transactions will appear shortly — refresh if needed.')
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
