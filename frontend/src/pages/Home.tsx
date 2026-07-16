export function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-success-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-neutral-900">
            💰 AI-Powered Budget Management
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            Connect your bank accounts, auto-categorize transactions, and generate insightful financial statements.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => onNavigate('signup')}
              className="btn-primary px-8 py-3 text-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="btn-secondary px-8 py-3 text-lg"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-neutral-900">Features</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card p-6">
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="mt-4 font-bold text-neutral-900">{feature.title}</h3>
                <p className="mt-2 text-neutral-600">{feature.description}</p>
              </div>
            ))}
          </div>
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
