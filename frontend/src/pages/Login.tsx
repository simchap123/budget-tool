import { useState } from 'react'
import axios from 'axios'

export function Login({
  onSuccess,
  onSignupClick,
}: {
  onSuccess: (user: any) => void
  onSignupClick: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      // Once 2FA is required, send the code in the X-OTP header; the backend
      // gate refuses to issue a token for a 2FA user without a valid code.
      const headers = mfaRequired ? { 'X-OTP': otp.trim() } : undefined
      const response = await axios.post(
        `${apiUrl}/collections/users/auth-with-password`,
        { identity: email, password },
        { headers }
      )
      localStorage.setItem('pb_auth', JSON.stringify(response.data))
      onSuccess(response.data.record)
    } catch (err: any) {
      const msg = err.response?.data?.message
      // PocketBase title-cases + punctuates thrown messages ("Mfa_required."),
      // so normalize before matching our markers.
      const marker = String(msg || '').toLowerCase().replace(/[^a-z_]/g, '')
      if (marker === 'mfa_required') {
        setMfaRequired(true)
        setError('')
      } else if (marker === 'mfa_invalid') {
        setMfaRequired(true)
        setError('That code was incorrect - try again.')
      } else {
        setError(msg || err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-display-md">Sign In</h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-sm border border-red-700 bg-red-500/10 p-4 text-red-400">
                {error}
              </div>
            )}

            {!mfaRequired ? (
              <>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-base"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-body-sm font-normal text-ink-200 mb-2">
                  Authentication code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="input-base tracking-[0.5em] text-center text-lg"
                  required
                />
                <p className="mt-2 text-body-sm text-ink-500">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2">
              {loading ? 'Signing in...' : mfaRequired ? 'Verify' : 'Sign In'}
            </button>
          </form>

          {!mfaRequired && (
            <p className="mt-6 text-center text-ink-400">
              Don't have an account?{' '}
              <button
                onClick={onSignupClick}
                className="inline-flex min-h-touch items-center font-normal text-accent-sunset hover:text-accent-sunset-soft"
              >
                Create one
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
