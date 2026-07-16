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
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <span className="text-2xl">💰</span>
            <span className="text-xl font-bold text-neutral-900">Budget Tool</span>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`font-medium ${
                    currentPage === 'dashboard'
                      ? 'text-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Dashboard
                </button>
                <div className="h-6 w-px bg-neutral-200" />
                <span className="text-sm text-neutral-600">{user.email}</span>
                <button
                  onClick={onLogout}
                  className="text-sm font-medium text-danger-600 hover:text-danger-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="font-medium text-neutral-600 hover:text-neutral-900"
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
