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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      const response = await axios.post(
        `${apiUrl}/collections/users/auth-with-password`,
        { identity: email, password }
      )

      localStorage.setItem('pb_auth', JSON.stringify(response.data))
      onSuccess(response.data.record)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed')
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

            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                required
              />
            </div>

            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-ink-400">
            Don't have an account?{' '}
            <button
              onClick={onSignupClick}
              className="font-normal text-accent-sunset hover:text-accent-sunset-soft"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
