import { useState, useEffect } from 'react'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Budget } from './pages/Budget'
import { Categories } from './pages/Categories'
import { Recurring } from './pages/Recurring'
import { Giving } from './pages/Giving'
import { Settings } from './pages/Settings'
import { Header } from './components/Header'
import { Onboarding } from './components/Onboarding'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initAnalytics, trackPageView } from './utils/analytics'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // First-run AI setup shows once, then remembers it was dismissed/completed.
  const maybeOnboard = () => {
    if (!localStorage.getItem('bt_onboarded')) setShowOnboarding(true)
  }

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('pb_auth')
    if (token) {
      const userData = JSON.parse(token)
      // pb_auth stores the full auth response { token, record }. Login/Signup pass
      // the record directly, so normalize to the record for a consistent shape.
      setUser(userData.record || userData)
      // Plaid redirects back with ?plaid=done. PlaidConnect polls for the
      // incoming history on mount, and it only lives on Settings now — so land
      // there rather than the Dashboard, or the import would never be watched.
      const returningFromPlaid =
        new URLSearchParams(window.location.search).get('plaid') === 'done'
      setCurrentPage(returningFromPlaid ? 'settings' : 'dashboard')
      initAnalytics(userData.record?.id || 'anonymous')
      if (!returningFromPlaid) maybeOnboard()
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
    <ErrorBoundary>
    <ToastProvider>
      <div className="min-h-screen bg-canvas">
        {/* The nav header is for signed-in app use. The marketing/auth pages
            (home, login, signup) carry their own CTAs, so rendering the header
            there just duplicated the Sign In / Get Started actions. */}
        {user && (
          <Header
            user={user}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
          />
        )}

        {/* Extra bottom padding leaves room for the mobile bottom nav. */}
        <main className={user ? 'pb-24 lg:pb-0' : ''}>
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
              // Brand-new accounts always get the guided AI setup.
              setShowOnboarding(true)
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
        {currentPage === 'recurring' && user && (
          <Recurring />
        )}
        {currentPage === 'giving' && user && (
          <Giving />
        )}
        {/* 'vendors' now opens the merged Categories & Vendors page on its
            Vendors tab, so old links and the bottom-nav still resolve. */}
        {currentPage === 'vendors' && user && (
          <Categories initialTab="vendors" />
        )}
        {currentPage === 'settings' && user && (
          <Settings user={user} onNavigate={setCurrentPage} onLogout={handleLogout} onStartSetup={() => setShowOnboarding(true)} />
        )}
        {currentPage === 'dashboard' && !user && (
          <Home onNavigate={setCurrentPage} />
        )}
      </main>

      {showOnboarding && user && (
        <Onboarding
          onClose={() => setShowOnboarding(false)}
          onNavigate={setCurrentPage}
        />
      )}
      </div>
    </ToastProvider>
    </ErrorBoundary>
  )
}
