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
  return (
    <header className="border-b border-ink-700 bg-canvas">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNavigate('home')}
          >
            <span className="text-2xl">💰</span>
            <span className="text-lg font-normal text-ink-50">Budget</span>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'dashboard'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigate('reports')}
                  className={`text-body-md font-normal transition-colors ${
                    currentPage === 'reports'
                      ? 'text-accent-sunset'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  Reports
                </button>
                <div className="h-6 w-px bg-ink-700" />
                <span className="text-body-sm text-ink-500">{user.email}</span>
                <button
                  onClick={onLogout}
                  className="text-body-sm font-normal text-accent-dusk hover:text-accent-twilight transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="text-body-md font-normal text-ink-400 hover:text-ink-200 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="btn-primary py-2"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
