import { useState, useEffect } from 'react'
import axios from 'axios'
import QRCode from 'qrcode'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { useToast } from './ui/Toast'

// Settings panel: enroll or remove TOTP two-factor authentication. The secret
// never leaves the server except once (the otpauth URI) during enrollment so the
// user can scan it into an authenticator app.
export function TwoFactor() {
  const toast = useToast()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = () => {
    const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
    return { Authorization: `Bearer ${auth.token}` }
  }

  const loadStatus = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/mfa/status`, { headers: headers() })
      setEnabled(!!data.enabled)
    } catch (e) {
      setEnabled(false)
    }
  }
  useEffect(() => { loadStatus() }, [])

  const startSetup = async () => {
    setBusy(true)
    try {
      const { data } = await axios.post(`${apiUrl}/mfa/setup`, {}, { headers: headers() })
      setSecret(data.secret)
      setQr(await QRCode.toDataURL(data.otpauth, { width: 220, margin: 1 }))
      setEnrolling(true)
      setCode('')
    } catch (e: any) {
      toast.error('Could not start setup: ' + (e?.response?.data?.error || e?.message))
    } finally {
      setBusy(false)
    }
  }

  const confirmEnable = async () => {
    setBusy(true)
    try {
      await axios.post(`${apiUrl}/mfa/enable`, { code: code.trim() }, { headers: headers() })
      toast.success('Two-factor authentication is on')
      setEnrolling(false)
      setSecret('')
      setQr('')
      setEnabled(true)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Invalid code - try again')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    const c = window.prompt('Enter a current 6-digit code to turn off two-factor authentication:')
    if (!c) return
    setBusy(true)
    try {
      await axios.post(`${apiUrl}/mfa/disable`, { code: c.trim() }, { headers: headers() })
      toast.success('Two-factor authentication turned off')
      setEnabled(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Invalid code')
    } finally {
      setBusy(false)
    }
  }

  if (enabled === null) return <div className="mt-4 card p-4 text-body-sm text-ink-500">Loading…</div>

  if (enabled) {
    return (
      <div className="mt-4 card p-4">
        <div className="flex items-center gap-2 text-accent-breeze">
          <ShieldCheck size={18} />
          <p className="text-ink-100">Two-factor authentication is on</p>
        </div>
        <p className="mt-1 text-body-sm text-ink-500">
          You'll be asked for a code from your authenticator app when you sign in.
        </p>
        <button onClick={disable} disabled={busy} className="btn-secondary mt-4 px-4 text-red-400 disabled:opacity-50">
          <ShieldOff size={16} className="mr-2" /> Turn off
        </button>
      </div>
    )
  }

  if (enrolling) {
    return (
      <div className="mt-4 card p-4">
        <p className="text-ink-100">Scan this with your authenticator app</p>
        <p className="mt-1 text-body-sm text-ink-500">Google Authenticator, Authy, 1Password, etc.</p>
        {qr && <img src={qr} alt="2FA QR code" className="mt-4 rounded-sm bg-white p-2" width={220} height={220} />}
        <p className="mt-3 text-body-sm text-ink-500">Or enter this key manually:</p>
        <code className="mt-1 block break-all rounded-sm bg-canvas-soft px-3 py-2 text-body-sm text-ink-200">{secret}</code>

        <label className="mt-4 block text-body-sm font-normal text-ink-200 mb-2">Enter the 6-digit code to confirm</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="input-base tracking-[0.4em] text-center"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={confirmEnable} disabled={busy || code.length !== 6} className="btn-primary px-4 disabled:opacity-50">
            {busy ? 'Verifying…' : 'Turn on'}
          </button>
          <button onClick={() => setEnrolling(false)} disabled={busy} className="btn-secondary px-4">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 card p-4">
      <div className="flex items-center gap-2">
        <ShieldOff size={18} className="text-ink-500" />
        <p className="text-ink-100">Two-factor authentication is off</p>
      </div>
      <p className="mt-1 text-body-sm text-ink-500">
        Add a second step at sign-in using an authenticator app - strongly recommended for a finance account.
      </p>
      <button onClick={startSetup} disabled={busy} className="btn-primary mt-4 px-4 disabled:opacity-50">
        {busy ? 'Starting…' : 'Set up two-factor'}
      </button>
    </div>
  )
}
