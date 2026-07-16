import { useState, useEffect } from 'react'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Header } from './components/Header'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('pb_auth')
    if (token) {
      setUser(JSON.parse(token))
      setCurrentPage('dashboard')
    }
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('pb_auth')
    setUser(null)
    setCurrentPage('home')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-neutral-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        user={user}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      <main>
        {currentPage === 'home' && <Home onNavigate={setCurrentPage} />}
        {currentPage === 'login' && (
          <Login
            onSuccess={(userData) => {
              setUser(userData)
              setCurrentPage('dashboard')
            }}
            onSignupClick={() => setCurrentPage('signup')}
          />
        )}
        {currentPage === 'signup' && (
          <Signup
            onSuccess={(userData) => {
              setUser(userData)
              setCurrentPage('dashboard')
            }}
            onLoginClick={() => setCurrentPage('login')}
          />
        )}
        {currentPage === 'dashboard' && user && (
          <Dashboard user={user} />
        )}
        {currentPage === 'dashboard' && !user && (
          <Home onNavigate={setCurrentPage} />
        )}
      </main>
    </div>
  )
}
