import { useState } from 'react'
import axios from 'axios'
import { LogOut, ChevronRight } from 'lucide-react'
import { PlaidConnect } from '../components/PlaidConnect'
import { BankConnections } from '../components/BankConnections'
import { EmailImport } from '../components/EmailImport'
import { TwoFactor } from '../components/TwoFactor'
import { useToast } from '../components/ui/Toast'
import { runAutoCategorize } from '../utils/autoCategorize'
import { invalidateCategories } from '../hooks/useCategories'
import { CATEGORY_TIERS } from '../utils/categoryTiers'

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
  const [seedingTier, setSeedingTier] = useState<string | null>(null)

  // Switch category detail level anytime. This is additive and non-destructive:
  // it only creates the tier's categories that don't already exist. Your
  // transactions and the categories you already use are never touched — so
  // moving from Simple to Detailed just gives you more buckets to sort into.
  const applyTier = async (tierId: string) => {
    const tier = CATEGORY_TIERS.find((t) => t.id === tierId)
    if (!tier || seedingTier) return
    const ok = window.confirm(
      `Add the “${tier.label}” category set (${tier.categories.length} categories)?\n\n` +
        `This only adds categories you don't already have. Your transactions and existing categories stay exactly as they are — nothing is renamed or recategorized.`
    )
    if (!ok) return
    setSeedingTier(tierId)
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const { data } = await axios.post(
        `${apiUrl}/rpc/seed-categories`,
        { names: tier.categories },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )
      invalidateCategories()
      const added = data?.created ?? 0
      toast.success(added > 0 ? `Added ${added} new ${tier.label.toLowerCase()} categories` : `You already have every ${tier.label.toLowerCase()} category`)
    } catch (e: any) {
      toast.error('Failed to add categories: ' + (e?.response?.data?.error || e?.message || 'unknown'))
    } finally {
      setSeedingTier(null)
    }
  }

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
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8 page-enter">
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
        <span className="min-w-0 flex-1">
          <span className="block text-ink-100">{categorizing ? 'Categorizing…' : 'Categorize all uncategorized (AI)'}</span>
          <span className="block text-body-sm text-ink-400">Sweeps every uncategorized transaction across all months — history first, then AI</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-500" />
      </button>

      {/* Banks */}
      <section className="mt-8">
        <h2 className="text-lg font-normal text-ink-50">Bank connections</h2>
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

      {/* Email import — capture transactions from forwarded bank alert emails. */}
      <section className="mt-10">
        <h2 className="text-lg font-normal text-ink-50">Email import</h2>
        <p className="mt-1 text-body-sm text-ink-500">
          Forward your bank / credit-card transaction alerts to a private address and
          they become transactions automatically.
        </p>
        <EmailImport />
      </section>

      {/* Category detail level — switch the starter system anytime. Additive, so
          it never loses transactions or existing categories. */}
      <section className="mt-10">
        <h2 className="text-lg font-normal text-ink-50">Category detail level</h2>
        <p className="mt-1 text-body-sm text-ink-500">
          Add a broader or more detailed category set. This only adds categories — your
          transactions and existing categories are never changed.
        </p>
        <div className="mt-4 space-y-2">
          {CATEGORY_TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTier(t.id)}
              disabled={!!seedingTier}
              className="flex w-full items-center gap-3 rounded-sm border border-ink-700 p-4 text-left transition-colors hover:bg-canvas-soft disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-ink-100">
                  {t.label}{' '}
                  {t.id === 'standard' && <span className="text-body-sm text-accent-sunset">· recommended</span>}
                </span>
                <span className="block text-body-sm text-ink-500">{t.blurb} ({t.categories.length} categories)</span>
                <span className="mt-0.5 block truncate text-body-sm text-ink-600">e.g. {t.categories.slice(0, 3).join(' · ')}…</span>
              </span>
              <span className="shrink-0 text-body-sm text-ink-400">{seedingTier === t.id ? 'Adding…' : 'Add set'}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Shortcuts to the pages that own their own settings */}
      <section className="mt-10">
        <h2 className="text-lg font-normal text-ink-50">Manage</h2>
        <div className="mt-4 card divide-y divide-ink-700">
          <SettingsLink
            title="Categories"
            description="Add, rename, recolour, and bulk-recategorize"
            onClick={() => onNavigate('categories')}
          />
          <SettingsLink
            title="Giving"
            description="Set the percentage of income you give, and which category tracks it"
            onClick={() => onNavigate('giving')}
          />
        </div>
      </section>

      {/* Security */}
      <section className="mt-10">
        <h2 className="text-lg font-normal text-ink-50">Security</h2>
        <p className="mt-1 text-body-sm text-ink-500">
          Protect your account with an authenticator-app code at sign-in.
        </p>
        <TwoFactor />
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
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full min-h-touch items-center gap-3 p-4 text-left transition-colors hover:bg-canvas-soft"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-ink-100">{title}</span>
        <span className="block text-body-sm text-ink-500">{description}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-500" />
    </button>
  )
}
