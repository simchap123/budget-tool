import { useState } from 'react'
import axios from 'axios'
import { Landmark } from 'lucide-react'
import { useToast } from './ui/Toast'

// Load the Plaid Link script on demand (avoids a build dependency).
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

  const connect = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${apiUrl}/plaid/create-link-token`, {}, { headers: headers() })
      const Plaid = await loadPlaid()
      const handler = Plaid.create({
        token: data.link_token,
        onSuccess: async (public_token: string, metadata: any) => {
          try {
            await axios.post(
              `${apiUrl}/plaid/exchange-public-token`,
              { public_token, institution: metadata?.institution?.name || '' },
              { headers: headers() }
            )
            toast.success('Bank connected — syncing…')
            const res = await axios.post(`${apiUrl}/plaid/sync`, {}, { headers: headers() })
            toast.success(`Synced ${res.data.added} new transactions`)
            onSynced()
          } catch (e: any) {
            toast.error('Sync failed: ' + (e.response?.data?.error || e.message))
          }
        },
        onExit: () => setLoading(false),
      })
      handler.open()
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
