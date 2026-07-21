import { useState } from 'react'
import { Menu, X, Settings, LayoutDashboard, Wallet, BarChart3, HandHeart } from 'lucide-react'

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
    <>
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
          <div className="hidden lg:flex items-center gap-6">
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
                  onClick={() => handleNavClick('categories')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'categories' || currentPage === 'vendors'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Categories
                </button>
                <button
                  onClick={() => handleNavClick('settings')}
                  className={`btn-icon ${currentPage === 'settings' ? 'text-accent-sunset' : ''}`}
                  title="Settings"
                  aria-label="Settings"
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
            className="btn-icon lg:hidden -mr-2"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          /* Nine items plus the email row can exceed a short phone screen in
             landscape, so the menu scrolls within the remaining viewport. */
          <div className="lg:hidden border-t border-ink-700 bg-canvas-card py-4 animate-slide-down max-h-[calc(100dvh-4rem)] overflow-y-auto pad-safe-b">
            <div className="space-y-1">
              {user ? (
                <>
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'dashboard'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => handleNavClick('budget')}
                    className={`flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'budget'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Budget
                  </button>
                  <button
                    onClick={() => handleNavClick('reports')}
                    className={`flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'reports'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Reports
                  </button>
                  <button
                    onClick={() => handleNavClick('recurring')}
                    className={`flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'recurring'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Recurring
                  </button>
                  <button
                    onClick={() => handleNavClick('giving')}
                    className={`flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'giving'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Giving
                  </button>
                  <button
                    onClick={() => handleNavClick('categories')}
                    className={`flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'categories' || currentPage === 'vendors'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Categories
                  </button>
                  <button
                    onClick={() => handleNavClick('settings')}
                    className={`flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal transition-colors ${
                      currentPage === 'settings'
                        ? 'text-accent-sunset'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    Settings
                  </button>
                  <div className="h-px w-full bg-ink-700" />
                  <span className="block px-4 py-2 text-body-sm text-ink-500">{user.email}</span>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center min-h-touch text-left px-4 py-2 text-body-sm font-normal text-accent-dusk hover:text-red-400 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavClick('login')}
                    className="flex w-full items-center min-h-touch text-left px-4 py-2 text-body-md font-normal text-ink-400 hover:text-ink-200 transition-colors"
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

    {/* Mobile bottom tab bar: primary destinations always one thumb-tap away
        (Giving included, so charity tracking is never buried in a menu). */}
    {user && <BottomNav currentPage={currentPage} onNavigate={onNavigate} />}
    </>
  )
}

const BOTTOM_ITEMS = [
  { page: 'dashboard', label: 'Home', Icon: LayoutDashboard },
  { page: 'budget', label: 'Budget', Icon: Wallet },
  { page: 'reports', label: 'Reports', Icon: BarChart3 },
  { page: 'giving', label: 'Giving', Icon: HandHeart },
  { page: 'settings', label: 'Settings', Icon: Settings },
] as const

function BottomNav({ currentPage, onNavigate }: { currentPage: string; onNavigate: (p: string) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-canvas/95 backdrop-blur lg:hidden pad-safe-b"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {BOTTOM_ITEMS.map(({ page, label, Icon }) => {
          const active = currentPage === page
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                active ? 'text-accent-sunset' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
