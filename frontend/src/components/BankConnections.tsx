import { useState, useEffect } from 'react'
import axios from 'axios'
import { AlertTriangle, Landmark, Trash2 } from 'lucide-react'
import { useToast } from './ui/Toast'

interface BankItem {
  itemId: string
  institution: string
  needsReauth: boolean
}

// Lists the user's linked banks with reconnect (if flagged) and disconnect.
// Renders nothing when no bank is connected.
export function BankConnections() {
  const [items, setItems] = useState<BankItem[]>([])
  const toast = useToast()

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  const load = () =>
    axios
      .get(`${apiUrl}/plaid/status`, { headers: headers() })
      .then((r) => setItems(r.data.items || []))
      .catch(() => {})

  useEffect(() => {
    load()
  }, [])

  const reconnect = async (itemId: string) => {
    try {
      const { data } = await axios.post(`${apiUrl}/plaid/reconnect`, { item_id: itemId }, { headers: headers() })
      if (data.hosted_link_url) window.location.href = data.hosted_link_url
      else throw new Error(data.error || 'Could not start reconnect')
    } catch (e: any) {
      toast.error('Reconnect failed: ' + (e.response?.data?.error || e.message))
    }
  }

  const disconnect = async (itemId: string, name: string) => {
    if (!window.confirm(`Disconnect ${name || 'this bank'}? Your existing transactions stay; only the live connection is removed.`)) return
    try {
      await axios.post(`${apiUrl}/plaid/disconnect`, { item_id: itemId }, { headers: headers() })
      toast.success('Bank disconnected')
      load()
    } catch (e: any) {
      toast.error('Disconnect failed: ' + (e.response?.data?.error || e.message))
    }
  }

  if (items.length === 0) return null

  return (
    <div className="mt-6 card p-4">
      <h3 className="text-body-sm text-ink-400 mb-3">Connected banks</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.itemId} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Landmark size={16} className="text-accent-breeze shrink-0" />
              <span className="text-body-sm text-ink-200 truncate">{it.institution || 'Connected bank'}</span>
              {it.needsReauth && (
                <span className="inline-flex items-center gap-1 text-body-sm text-yellow-400">
                  <AlertTriangle size={14} /> needs reconnect
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {it.needsReauth && (
                <button onClick={() => reconnect(it.itemId)} className="btn-secondary py-1 px-3 text-body-sm">
                  Reconnect
                </button>
              )}
              <button
                onClick={() => disconnect(it.itemId, it.institution)}
                aria-label="Disconnect bank"
                className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
