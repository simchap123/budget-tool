import { useState } from 'react'
import { Menu, X, Settings } from 'lucide-react'

export function Header({
  user,
  currentPage,
  onNavigate,
  onLogout,
}: {
  user: any
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavClick = (page: string) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  return (
    <header className="border-b border-ink-700 bg-canvas">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleNavClick('home')}
          >
            <span className="text-2xl">💰</span>
            <span className="text-lg font-normal text-ink-50 hidden sm:inline">Budget</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'dashboard'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => handleNavClick('budget')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'budget'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Budget
                </button>
                <button
                  onClick={() => handleNavClick('reports')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'reports'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Reports
                </button>
                <button
                  onClick={() => handleNavClick('analytics')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'analytics'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => handleNavClick('recurring')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'recurring'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Recurring
                </button>
                <button
                  onClick={() => handleNavClick('giving')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'giving'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Giving
                </button>
                <button
                  onClick={() => handleNavClick('vendors')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'vendors'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Vendors
                </button>
                <button
                  onClick={() => handleNavClick('categories')}
                  className="p-1 text-ink-400 hover:text-ink-200 transition-colors"
                  title="Categories"
                >
                  <Settings size={20} />
                </button>
                <div className="h-6 w-px bg-ink-700" />
                <span className="text-body-sm text-ink-500">{user.email}</span>
                <button
                  onClick={onLogout}
                  className="text-body-sm font-normal text-accent-dusk hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavClick('login')}
                  className="text-body-md font-normal text-ink-400 hover:text-ink-200 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavClick('signup')}
                  className="btn-primary py-2"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="md:hidden text-ink-400 hover:text-ink-200 transition-colors"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="md:hidden border-t border-ink-700 bg-canvas-card py-4 animate-slide-down">
            <div className="space-y-3">
              {user ? (
                <>
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'dashboard'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => handleNavClick('budget')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'budget'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Budget
                  </button>
                  <button
                    onClick={() => handleNavClick('reports')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'reports'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Reports
                  </button>
                  <button
                    onClick={() => handleNavClick('analytics')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'analytics'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => handleNavClick('recurring')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'recurring'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Recurring
                  </button>
                  <button
                    onClick={() => handleNavClick('giving')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'giving'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Giving
                  </button>
                  <button
                    onClick={() => handleNavClick('vendors')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'vendors'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Vendors
                  </button>
                  <button
                    onClick={() => handleNavClick('categories')}
                    className={`block w-full text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'categories'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Categories
                  </button>
                  <div className="h-px w-full bg-ink-700" />
                  <span className="block px-4 py-2 text-body-sm text-ink-500">{user.email}</span>
                  <button
                    onClick={onLogout}
                    className="block w-full text-left px-4 py-2 text-body-sm font-normal text-accent-dusk hover:text-red-400 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavClick('login')}
                    className="block w-full text-left px-4 py-2 text-body-md font-normal text-ink-400 hover:text-ink-200 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavClick('signup')}
                    className="btn-primary mx-4 w-[calc(100%-2rem)]"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
