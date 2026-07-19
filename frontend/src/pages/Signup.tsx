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
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      await axios.post(
        `${apiUrl}/collections/users/records`,
        { email, password, passwordConfirm, name }
      )

      const loginResponse = await axios.post(
        `${apiUrl}/collections/users/auth-with-password`,
        { identity: email, password }
      )

      localStorage.setItem('pb_auth', JSON.stringify(loginResponse.data))
      onSuccess(loginResponse.data.record)
    } catch (err: any) {
      // Extract detailed error message from validation errors
      const responseData = err.response?.data
      let errorMessage = 'Signup failed'

      if (responseData?.data?.email?.message) {
        errorMessage = responseData.data.email.message
      } else if (responseData?.data?.password?.message) {
        errorMessage = responseData.data.password.message
      } else if (responseData?.data?.name?.message) {
        errorMessage = responseData.data.name.message
      } else if (responseData?.message) {
        errorMessage = responseData.message
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-display-md">Create Account</h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-sm border border-red-700 bg-red-500/10 p-4 text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
                required
              />
            </div>

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

            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="input-base"
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

          <p className="mt-6 text-center text-ink-400">
            Already have an account?{' '}
            <button
              onClick={onLoginClick}
              className="font-normal text-accent-sunset hover:text-accent-sunset-soft"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
