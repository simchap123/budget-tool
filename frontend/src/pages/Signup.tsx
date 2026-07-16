import { useState } from 'react'
import axios from 'axios'

export function Signup({
  onSuccess,
  onLoginClick,
}: {
  onSuccess: (user: any) => void
  onLoginClick: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Create user
      const createResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8090'}/api/collections/users/records`,
        {
          email,
          password,
          passwordConfirm,
          name,
        }
      )

      // Login
      const loginResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8090'}/api/collections/users/auth-with-password`,
        { identity: email, password }
      )

      localStorage.setItem('pb_auth', JSON.stringify(loginResponse.data))
      onSuccess(loginResponse.data.record)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-neutral-900">Create Account</h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-danger-50 p-4 text-danger-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="input-base mt-1"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-neutral-600">
            Already have an account?{' '}
            <button
              onClick={onLoginClick}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
