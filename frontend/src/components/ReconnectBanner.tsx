import { useState, useEffect } from 'react'
import axios from 'axios'
import { AlertTriangle } from 'lucide-react'
import { useToast } from './ui/Toast'

interface ReauthItem {
  itemId: string
  institution: string
}

// Shows a banner when a linked bank needs re-authentication (Plaid
// ITEM_LOGIN_REQUIRED), with a button to re-run Link in update mode.
export function ReconnectBanner() {
  const [items, setItems] = useState<ReauthItem[]>([])
  const toast = useToast()

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  useEffect(() => {
    axios
      .get(`${apiUrl}/plaid/status`, { headers: headers() })
      .then((res) => setItems(res.data.needsReauth || []))
      .catch(() => {
        /* best-effort */
      })
  }, [])

  const reconnect = async (itemId: string) => {
    try {
      const { data } = await axios.post(
        `${apiUrl}/plaid/reconnect`,
        { item_id: itemId },
        { headers: headers() }
      )
      if (data.hosted_link_url) window.location.href = data.hosted_link_url
      else throw new Error(data.error || 'Could not start reconnect')
    } catch (e: any) {
      toast.error('Could not start reconnect: ' + (e.response?.data?.error || e.message))
    }
  }

  if (items.length === 0) return null

  return (
    <div className="mt-6 rounded-sm border border-yellow-700 bg-yellow-500/10 p-4 space-y-2">
      {items.map((it) => (
        <div key={it.itemId} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-yellow-300">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-body-sm">
              {it.institution || 'A connected bank'} needs reconnecting to keep syncing.
            </span>
          </div>
          <button
            onClick={() => reconnect(it.itemId)}
            className="btn-secondary py-1 px-3 text-body-sm shrink-0"
          >
            Reconnect
          </button>
        </div>
      ))}
    </div>
  )
}
