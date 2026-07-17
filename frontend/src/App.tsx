import { useState, useEffect } from 'react'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Budget } from './pages/Budget'
import { Categories } from './pages/Categories'
import { Analytics } from './pages/Analytics'
import { Header } from './components/Header'
import { ToastProvider } from './components/ui/Toast'
import { initAnalytics, trackPageView } from './utils/analytics'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('pb_auth')
    if (token) {
      const userData = JSON.parse(token)
      setUser(userData)
      setCurrentPage('dashboard')
      initAnalytics(userData.record?.id || 'anonymous')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    trackPageView(currentPage)
  }, [currentPage])

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
    <ToastProvider>
      <div className="min-h-screen bg-canvas">
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
              initAnalytics(userData.record?.id || 'anonymous')
              setCurrentPage('dashboard')
            }}
            onSignupClick={() => setCurrentPage('signup')}
          />
        )}
        {currentPage === 'signup' && (
          <Signup
            onSuccess={(userData) => {
              setUser(userData)
              initAnalytics(userData.record?.id || 'anonymous')
              setCurrentPage('dashboard')
            }}
            onLoginClick={() => setCurrentPage('login')}
          />
        )}
        {currentPage === 'dashboard' && user && (
          <Dashboard user={user} />
        )}
        {currentPage === 'budget' && user && (
          <Budget />
        )}
        {currentPage === 'reports' && user && (
          <Reports />
        )}
        {currentPage === 'categories' && user && (
          <Categories />
        )}
        {currentPage === 'analytics' && user && (
          <Analytics />
        )}
        {currentPage === 'dashboard' && !user && (
          <Home onNavigate={setCurrentPage} />
        )}
      </main>
      </div>
    </ToastProvider>
  )
}
