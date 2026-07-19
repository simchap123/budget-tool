import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { Landmark, AlertTriangle } from 'lucide-react'
import { usePlaidLink } from 'react-plaid-link'
import { useToast } from './ui/Toast'

// Embedded web Plaid Link: opens an in-app popup (no leaving the app), forces the
// WEB OAuth flow for banks like Chase, and exchanges the token directly in
// onSuccess (no dependency on a completion webhook). For OAuth banks the whole
// page redirects to the bank and back to our redirect_uri (?oauth_state_id=...);
// we resume Link with the stored token + receivedRedirectUri.
const TOKEN_KEY = 'plaid_link_token'

export function PlaidConnect({ onSynced }: { onSynced: () => void }) {
  const toast = useToast()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [chaseDegraded, setChaseDegraded] = useState(false)
  const openedRef = useRef(false)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  const isOAuthReturn = typeof window !== 'undefined' && /[?&]oauth_state_id=/.test(window.location.search)

  useEffect(() => {
    // Resume Link after a bank OAuth redirect using the token we stored pre-redirect.
    if (isOAuthReturn) {
      const saved = localStorage.getItem(TOKEN_KEY)
      if (saved) setLinkToken(saved)
    }
    // Surface Chase's live login health (it 500s while its status is DEGRADED).
    axios.get(`${apiUrl}/plaid/bank-status`, { headers: headers() })
      .then((r) => setChaseDegraded(!!r.data.degraded))
      .catch(() => {})
  }, [])

  const finish = useCallback(async (public_token: string, institution?: string) => {
    setLoading(true)
    try {
      await axios.post(`${apiUrl}/plaid/exchange-public-token`, { public_token, institution: institution || '' }, { headers: headers() })
      localStorage.removeItem(TOKEN_KEY)
      window.history.replaceState({}, '', window.location.pathname)
      toast.success('Bank connected — importing your full history…')

      // Chase's history (up to 24 months) loads over time (INITIAL_UPDATE ~30 days,
      // then HISTORICAL_UPDATE). Keep calling /transactions/sync (cursor-based) until
      // it stops returning new transactions — so ALL of it pulls in without relying
      // on the webhook. Early data appears live; the rest fills in.
      let total = 0
      let quiet = 0
      for (let i = 0; i < 30 && quiet < 4; i++) {
        let added = 0
        try {
          const { data } = await axios.post(`${apiUrl}/plaid/sync`, {}, { headers: headers() })
          added = data.added || 0
        } catch { /* PRODUCT_NOT_READY early on — just retry */ }
        if (added > 0) {
          total += added
          quiet = 0
          onSynced() // refresh the dashboard as batches land
        } else {
          quiet++
        }
        if (quiet >= 4) break
        await new Promise((r) => setTimeout(r, 6000))
      }
      toast.success(total > 0 ? `Imported ${total} transactions` : 'Connected — transactions will appear shortly')
      onSynced()
    } catch (e: any) {
      toast.error('Connect failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setLinkToken(null)
      setLoading(false)
    }
  }, [onSynced])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri: isOAuthReturn ? window.location.href : undefined,
    onSuccess: (public_token, metadata) => finish(public_token, metadata?.institution?.name),
    onExit: (err) => {
      localStorage.removeItem(TOKEN_KEY)
      setLinkToken(null)
      setLoading(false)
      if (err) toast.error("Connection didn't finish: " + (err.display_message || err.error_message || 'cancelled'))
    },
  })

  // Open the popup once Link is ready (both a fresh click and an OAuth resume).
  useEffect(() => {
    if (linkToken && ready && !openedRef.current) {
      openedRef.current = true
      open()
    }
  }, [linkToken, ready])

  const connect = async () => {
    setLoading(true)
    openedRef.current = false
    try {
      const { data } = await axios.post(`${apiUrl}/plaid/create-link-token`, {}, { headers: headers() })
      if (!data.link_token) throw new Error(data.error || 'Could not start Plaid')
      localStorage.setItem(TOKEN_KEY, data.link_token)
      setLinkToken(data.link_token) // → ready → auto-open
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
