import { useState, useEffect } from 'react'
import axios from 'axios'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { useToast } from './ui/Toast'
import type { InboxInfo } from '../utils/emailImport'

// Settings panel: shows the user's private inbound email address and lets them
// enable/disable capture or rotate the address. Bank alerts forwarded to this
// address become transactions (in the Needs-review list) within a minute.
export function EmailImport() {
  const toast = useToast()
  const [inbox, setInbox] = useState<InboxInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  const load = async () => {
    try {
      const { data } = await axios.post(`${apiUrl}/rpc/email-inbox`, {}, { headers: headers() })
      setInbox(data)
    } catch (e: any) {
      toast.error('Could not load your email address: ' + (e?.response?.data?.error || e?.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const copy = async () => {
    if (!inbox?.address) return
    try {
      await navigator.clipboard.writeText(inbox.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      toast.error('Copy failed - select and copy manually')
    }
  }

  const rotate = async () => {
    if (!window.confirm('Generate a new address? The current one will stop working immediately.')) return
    setBusy(true)
    try {
      const { data } = await axios.post(`${apiUrl}/rpc/email-inbox/rotate`, {}, { headers: headers() })
      setInbox(data)
      toast.success('New address generated')
    } catch (e: any) {
      toast.error('Rotate failed: ' + (e?.response?.data?.error || e?.message))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async () => {
    if (!inbox) return
    const enabled = !inbox.enabled
    setBusy(true)
    try {
      const { data } = await axios.post(`${apiUrl}/rpc/email-inbox/toggle`, { enabled }, { headers: headers() })
      setInbox(data)
      toast.success(enabled ? 'Email capture on' : 'Email capture paused')
    } catch (e: any) {
      toast.error('Update failed: ' + (e?.response?.data?.error || e?.message))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="mt-4 card p-4 text-body-sm text-ink-500">Loading…</div>

  return (
    <div className="mt-4 card p-4">
      <p className="text-body-sm text-ink-400">Your private address</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all rounded-sm bg-canvas-soft px-3 py-2 text-ink-100">
          {inbox?.address}
        </code>
        <button onClick={copy} className="btn-secondary px-3 shrink-0" aria-label="Copy address">
          {copied ? <Check size={16} className="text-accent-breeze" /> : <Copy size={16} />}
          <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <p className="mt-3 text-body-sm text-ink-500">
        In your bank's alert settings - or as a Gmail filter - forward transaction
        alert emails to this address. New transactions land in <strong>Needs review</strong>
        {' '}on your Dashboard, where you confirm or discard them.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={toggle} disabled={busy} className="btn-secondary px-4 disabled:opacity-50">
          {inbox?.enabled ? 'Pause capture' : 'Resume capture'}
        </button>
        <button onClick={rotate} disabled={busy} className="btn-secondary px-3 disabled:opacity-50" title="Generate a new address">
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
          <span className="ml-2">Rotate address</span>
        </button>
        {!inbox?.enabled && <span className="text-body-sm text-accent-dusk">Capture is paused</span>}
      </div>
    </div>
  )
}
