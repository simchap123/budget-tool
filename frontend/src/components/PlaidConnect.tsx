import { useState, useEffect } from 'react'
import axios from 'axios'
import { Landmark } from 'lucide-react'
import { useToast } from './ui/Toast'

const LINK_TOKEN_KEY = 'plaid_link_token'

// Load the Plaid Link script on demand (must come from cdn.plaid.com).
function loadPlaid(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any
    if (w.Plaid) return resolve(w.Plaid)
    const s = document.createElement('script')
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    s.onload = () => resolve((window as any).Plaid)
    s.onerror = () => reject(new Error('Failed to load Plaid Link'))
    document.body.appendChild(s)
  })
}

export function PlaidConnect({ onSynced }: { onSynced: () => void }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  const exchangeAndSync = async (publicToken: string, metadata: any) => {
    try {
      await axios.post(
        `${apiUrl}/plaid/exchange-public-token`,
        { public_token: publicToken, institution: metadata?.institution?.name || '' },
        { headers: headers() }
      )
      toast.success('Bank connected — syncing…')
      const res = await axios.post(`${apiUrl}/plaid/sync`, {}, { headers: headers() })
      toast.success(`Synced ${res.data.added} transactions`)
      localStorage.removeItem(LINK_TOKEN_KEY)
      onSynced()
    } catch (e: any) {
      toast.error('Sync failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  // token: the link_token; receivedRedirectUri: set only when resuming an OAuth flow
  const openLink = async (token: string, receivedRedirectUri?: string) => {
    const Plaid = await loadPlaid()
    const config: any = {
      token,
      onSuccess: (publicToken: string, metadata: any) => exchangeAndSync(publicToken, metadata),
      onExit: (err: any) => {
        setLoading(false)
        if (err) toast.error('Plaid: ' + (err.display_message || err.error_message || 'exited'))
      },
    }
    if (receivedRedirectUri) config.receivedRedirectUri = receivedRedirectUri
    Plaid.create(config).open()
  }

  // On return from an OAuth institution, the bank redirects back to our
  // redirect_uri with ?oauth_state_id=... — resume Link to finish the flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('oauth_state_id')) {
      const token = localStorage.getItem(LINK_TOKEN_KEY)
      if (token) {
        const href = window.location.href
        window.history.replaceState({}, '', window.location.pathname)
        setLoading(true)
        openLink(token, href)
      }
    }
  }, [])

  const connect = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${apiUrl}/plaid/create-link-token`, {}, { headers: headers() })
      // Persist across the OAuth redirect (browser leaves and returns).
      localStorage.setItem(LINK_TOKEN_KEY, data.link_token)
      await openLink(data.link_token)
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
