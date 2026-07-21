import { useState } from 'react'
import { Landmark, Tags, HandHeart, LogOut, ChevronRight, Sparkles, Wand2 } from 'lucide-react'
import { PlaidConnect } from '../components/PlaidConnect'
import { BankConnections } from '../components/BankConnections'
import { useToast } from '../components/ui/Toast'
import { runAutoCategorize } from '../utils/autoCategorize'
import { invalidateCategories } from '../hooks/useCategories'

// Central place for account-level configuration. Bank linking lives here rather
// than on the Dashboard, which is a working surface — connecting a bank is a
// once-in-a-while setup action, not something you do while reviewing spend.
export function Settings({
  user,
  onNavigate,
  onLogout,
  onStartSetup,
}: {
  user: any
  onNavigate: (page: string) => void
  onLogout: () => void
  onStartSetup?: () => void
}) {
  const toast = useToast()
  const [categorizing, setCategorizing] = useState(false)

  // All-time sweep: categorizes every uncategorized transaction in the account
  // (not just the current month), history + AI, looping until the queue is empty.
  const sweepCategorize = async () => {
    setCategorizing(true)
    try {
      const total = await runAutoCategorize((n) => toast.info(`Categorizing… ${n} done`))
      invalidateCategories()
      toast.success(total > 0 ? `Categorized ${total} transaction${total === 1 ? '' : 's'}` : 'Nothing left to categorize')
    } catch (e: any) {
      toast.error('Categorization failed: ' + (e?.response?.data?.error || e?.message || 'unknown'))
    } finally {
      setCategorizing(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div>
        <h1 className="text-display-lg">Settings</h1>
        <p className="mt-2 text-ink-400">Banks, categories, and account</p>
      </div>

      {/* Re-run the guided AI setup anytime. */}
      {onStartSetup && (
        <button
          onClick={onStartSetup}
          className="mt-6 flex w-full items-center gap-3 rounded-sm border border-accent-sunset/40 bg-accent-sunset/10 p-4 text-left transition-colors hover:bg-accent-sunset/15"
        >
          <Sparkles size={20} className="shrink-0 text-accent-sunset" />
          <span className="min-w-0 flex-1">
            <span className="block text-ink-100">Set up with AI</span>
            <span className="block text-body-sm text-ink-400">Analyze your spending and suggest budgets &amp; goals</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-500" />
        </button>
      )}

      {/* All-time AI categorization sweep */}
      <button
        onClick={sweepCategorize}
        disabled={categorizing}
        className="mt-4 flex w-full items-center gap-3 rounded-sm border border-accent-twilight/40 bg-accent-twilight/10 p-4 text-left transition-colors hover:bg-accent-twilight/15 disabled:opacity-60"
      >
        <Wand2 size={20} className="shrink-0 text-accent-twilight" />
        <span className="min-w-0 flex-1">
          <span className="block text-ink-100">{categorizing ? 'Categorizing…' : 'Categorize all uncategorized (AI)'}</span>
          <span className="block text-body-sm text-ink-400">Sweeps every uncategorized transaction across all months — history first, then AI</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-500" />
      </button>

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
