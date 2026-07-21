import { Landmark, Tags, HandHeart, LogOut, ChevronRight } from 'lucide-react'
import { PlaidConnect } from '../components/PlaidConnect'
import { BankConnections } from '../components/BankConnections'

// Central place for account-level configuration. Bank linking lives here rather
// than on the Dashboard, which is a working surface — connecting a bank is a
// once-in-a-while setup action, not something you do while reviewing spend.
export function Settings({
  user,
  onNavigate,
  onLogout,
}: {
  user: any
  onNavigate: (page: string) => void
  onLogout: () => void
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div>
        <h1 className="text-display-lg">Settings</h1>
        <p className="mt-2 text-ink-400">Banks, categories, and account</p>
      </div>

      {/* Banks */}
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Landmark size={18} className="text-accent-breeze" />
          <h2 className="text-lg font-normal text-ink-50">Bank connections</h2>
        </div>
        <p className="mt-1 text-body-sm text-ink-500">
          Link an account to sync transactions automatically. Your existing
          transactions stay if you later disconnect.
        </p>
        <div className="mt-4">
          <PlaidConnect />
        </div>
        {/* Renders nothing until at least one bank is linked. */}
        <BankConnections />
      </section>

      {/* Shortcuts to the pages that own their own settings */}
      <section className="mt-10">
        <h2 className="text-lg font-normal text-ink-50">Manage</h2>
        <div className="mt-4 card divide-y divide-ink-700">
          <SettingsLink
            icon={<Tags size={18} className="text-accent-sunset" />}
            title="Categories"
            description="Add, rename, recolour, and bulk-recategorize"
            onClick={() => onNavigate('categories')}
          />
          <SettingsLink
            icon={<HandHeart size={18} className="text-accent-twilight" />}
            title="Giving"
            description="Set the percentage of income you give, and which category tracks it"
            onClick={() => onNavigate('giving')}
          />
        </div>
      </section>

      {/* Account */}
      <section className="mt-10">
        <h2 className="text-lg font-normal text-ink-50">Account</h2>
        <div className="mt-4 card p-4">
          <p className="text-body-sm text-ink-500">Signed in as</p>
          <p className="mt-1 text-ink-100 break-words">{user?.email}</p>
          <button
            onClick={onLogout}
            className="btn-secondary mt-4 w-full px-4 sm:w-auto"
          >
            <LogOut size={16} className="mr-2" /> Log out
          </button>
        </div>
      </section>
    </div>
  )
}

function SettingsLink({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full min-h-touch items-center gap-3 p-4 text-left transition-colors hover:bg-canvas-soft"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-ink-100">{title}</span>
        <span className="block text-body-sm text-ink-500">{description}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-500" />
    </button>
  )
}
