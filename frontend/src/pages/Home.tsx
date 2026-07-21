export function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-canvas page-enter">
      <div className="mx-auto max-w-[1800px] px-4 py-20 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center animate-fade-in">
          <h1 className="text-display-lg tracking-tight">
            AI-Powered Budget
          </h1>
          <p className="mt-6 text-lg text-ink-400">
            Connect your accounts. Auto-categorize transactions. Generate statements.
          </p>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => onNavigate('signup')}
              className="btn-primary px-8 py-3"
            >
              Get Started
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="btn-secondary px-8 py-3"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32">
          <h2 className="text-display-md animate-fade-in">Features</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="card p-6 animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="mt-4 text-lg font-normal text-ink-50">{feature.title}</h3>
                <p className="mt-2 text-body-sm text-ink-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 border border-ink-700 bg-canvas-card p-12 rounded-sm">
          <h3 className="text-display-sm">Ready to control your finances?</h3>
          <p className="mt-4 text-ink-400">
            Start with unlimited accounts, AI-powered categorization, and beautiful reports.
          </p>
          <button
            onClick={() => onNavigate('signup')}
            className="mt-6 btn-primary px-8 py-3"
          >
            Get Started Free
          </button>
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    icon: '🏦',
    title: 'Bank Integration',
    description: 'Connect to 12,000+ banks with Plaid or upload statements.',
  },
  {
    icon: '🤖',
    title: 'AI Categorization',
    description: 'Claude automatically categorizes transactions with learning.',
  },
  {
    icon: '📊',
    title: 'Smart Reports',
    description: 'Generate income statements like QuickBooks.',
  },
  {
    icon: '🎯',
    title: 'Rule Engine',
    description: 'Create custom rules that improve over time.',
  },
  {
    icon: '🔐',
    title: 'Self-Hosted',
    description: 'Full control over your financial data.',
  },
  {
    icon: '💰',
    title: 'Affordable',
    description: 'Just $5/month hosting, no recurring software fees.',
  },
]
