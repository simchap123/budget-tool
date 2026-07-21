import { useState, useEffect } from 'react'
import axios from 'axios'
import { Pencil, Trash2, Landmark, Tag } from 'lucide-react'
import { SwipeableRow } from '../components/ui/SwipeableRow'
import { QuickCategorySheet } from '../components/ui/QuickCategorySheet'
import { CSVImport } from '../components/CSVImport'
import { UpcomingBills } from '../components/UpcomingBills'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { trackTransactionAction } from '../utils/analytics'
import { monthRange, formatDate } from '../utils/dateRange'
import { filterTransactions } from '../utils/search'
import { reportTotals, txAmount } from '../utils/reportStats'
import { CategorySelect } from '../components/ui/CategorySelect'
import { useCategories, invalidateCategories } from '../hooks/useCategories'
import { merchantKey } from '../utils/merchant'
import { runAutoCategorize } from '../utils/autoCategorize'

// Whether a transaction still needs a category (empty or the "Uncategorized"
// placeholder) — the predicate behind both the queue toggle and the button's
// visibility.
const isUncategorized = (txn: any) => !txn.category || txn.category === 'Uncategorized'

// The merchant a transaction rolls up to — the same normalized key the Vendors
// page groups on — title-cased for display next to the category.
const vendorName = (description: string) =>
  merchantKey(description || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

export function Dashboard({ user }: { user: any }) {
  const toast = useToast()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingOriginal, setEditingOriginal] = useState<{ category: string; description: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({ amount: '', description: '', type: 'expense', category: '', note: '', date: new Date().toISOString().split('T')[0] })
  const categories = useCategories()
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [search, setSearch] = useState('')
  // The "uncategorized queue" toggle: filter the list down to rows still needing
  // a category so they can be cleared out one by one.
  const [onlyUncategorized, setOnlyUncategorized] = useState(false)
  // True while a bulk auto-categorize run is in flight (disables the button).
  const [autoCat, setAutoCat] = useState(false)
  // Which mobile row is swiped open (only ever one), and which transaction the
  // quick-category sheet is currently editing.
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [categorizing, setCategorizing] = useState<any | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [selectedMonth])

  const fetchTransactions = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      const { start: monthStart, endExclusive } = monthRange(selectedMonth)
      const filter = `(date>='${monthStart}'&&date<'${endExclusive}')`

      // Fetch the whole month so the Income/Expenses/Net totals are correct;
      // paginate the table client-side (25/page).
      const response = await axios.get(
        `${apiUrl}/collections/transactions/records?perPage=500&filter=${encodeURIComponent(filter)}&sort=-date`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )
      setTransactions(response.data.items || [])
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      if (editingId) {
        // Update existing transaction
        await axios.patch(
          `${apiUrl}/collections/transactions/records/${editingId}`,
          {
            amount: parseFloat(formData.amount),
            description: formData.description,
            type: formData.type,
            category: formData.category || 'Uncategorized',
            note: formData.note || '',
            date: formData.date,
          },
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }
        )
        trackTransactionAction('edit', formData.type)

        // Category propagation: if the user changed the category, offer to apply
        // it to every other transaction from the SAME merchant. We match on the
        // normalized merchant key (not the exact description) so the same store
        // on different dates — with different date/transaction-code suffixes —
        // still groups together. Confirm first, since a mixed merchant like
        // Amazon can legitimately span many categories.
        const newCat = formData.category || 'Uncategorized'
        const desc = formData.description || ''
        if (editingOriginal && editingOriginal.category !== newCat && desc.trim()) {
          try {
            const preview = await axios.post(
              `${apiUrl}/rpc/recategorize-similar`,
              { description: desc, category: newCat },
              { headers: { Authorization: `Bearer ${auth.token}` } }
            )
            const others = (preview.data?.count || 0) - 1 // exclude the row just edited
            if (others > 0 && window.confirm(`Also change the other ${others} "${preview.data.key}" transaction${others === 1 ? '' : 's'} to "${newCat}"?`)) {
              const res = await axios.post(
                `${apiUrl}/rpc/recategorize-similar`,
                { description: desc, category: newCat, apply: true },
                { headers: { Authorization: `Bearer ${auth.token}` } }
              )
              toast.success(`Updated ${res.data?.updated || 0} matching transaction${res.data?.updated === 1 ? '' : 's'}`)
              invalidateCategories()
            }
          } catch (err) {
            console.error('Category propagation failed:', err)
          }
        }
      } else {
        // Create new transaction
        await axios.post(
          `${apiUrl}/collections/transactions/records`,
          {
            amount: parseFloat(formData.amount),
            description: formData.description,
            type: formData.type,
            category: formData.category || 'Uncategorized',
            note: formData.note || '',
            date: formData.date,
            userId: auth.record.id,
          },
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }
        )
        trackTransactionAction('add', formData.type)
      }

      setFormData({ amount: '', description: '', type: 'expense', category: '', note: '', date: new Date().toISOString().split('T')[0] })
      setFormOpen(false)
      setEditingId(null)
      setEditingOriginal(null)
      await fetchTransactions()
    } catch (err: any) {
      console.error('Error saving transaction:', err)
      toast.error('Failed to save transaction: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      await axios.delete(
        `${apiUrl}/collections/transactions/records/${id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )

      trackTransactionAction('delete', 'expense')
      setShowDeleteConfirm(null)
      await fetchTransactions()
    } catch (err: any) {
      console.error('Error deleting transaction:', err)
      toast.error('Failed to delete transaction')
    }
  }

  // Reassign a single transaction's category without opening the edit form.
  // Optimistic: the row updates immediately and reverts if the write fails,
  // because the whole point of this path is that it feels instant.
  const handleQuickCategory = async (txn: any, category: string) => {
    const previous = txn.category
    setCategorizing(null)
    setTransactions((prev: any) =>
      prev.map((t: any) => (t.id === txn.id ? { ...t, category } : t))
    )
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      await axios.patch(
        `${apiUrl}/collections/transactions/records/${txn.id}`,
        { category },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )
      trackTransactionAction('edit', txn.type)
      invalidateCategories()
    } catch (err: any) {
      console.error('Quick category change failed:', err)
      setTransactions((prev: any) =>
        prev.map((t: any) => (t.id === txn.id ? { ...t, category: previous } : t))
      )
      toast.error('Could not change category')
    }
  }

  const handleEditTransaction = (txn: any) => {
    setEditingId(txn.id)
    setEditingOriginal({ category: txn.category || 'Uncategorized', description: txn.description || '' })
    setFormData({
      amount: txn.amount.toString(),
      description: txn.description,
      type: txn.type,
      category: txn.category || 'Uncategorized',
      note: txn.note || '',
      // Stored dates look like "2026-07-16 00:00:00.000Z"; a <input type="date">
      // needs "YYYY-MM-DD", so take the first 10 chars (else the field goes blank).
      date: txn.date ? String(txn.date).slice(0, 10) : new Date().toISOString().split('T')[0],
    })
    setFormOpen(true)
  }

  // Suggest a category from the user's history (trend memory) when they finish
  // typing a description and haven't set a category yet.
  const suggestCategory = async () => {
    if (!formData.description.trim() || formData.category.trim()) return
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const { data } = await axios.post(
        `${apiUrl}/ai/suggest-category`,
        { description: formData.description },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )
      if (data.category) {
        setFormData((f) => (f.category.trim() ? f : { ...f, category: data.category }))
      }
    } catch {
      /* suggestion is best-effort */
    }
  }

  // Bulk-categorize every uncategorized transaction via the AI endpoint. The
  // driver loops the backend until the queue drains; we surface progress as
  // toasts, then refetch and refresh the category dropdowns.
  const handleAutoCategorize = async () => {
    setAutoCat(true)
    toast.info('Categorizing…')
    try {
      const total = await runAutoCategorize((done) => {
        if (done > 0) toast.info(`Categorizing… ${done} done`)
      })
      await fetchTransactions()
      invalidateCategories()
      if (total > 0) toast.success(`Categorized ${total} transaction${total === 1 ? '' : 's'}`)
      else toast.info('No new categories found')
    } catch (err) {
      console.error('Auto-categorize failed:', err)
      toast.error('Could not auto-categorize')
    } finally {
      setAutoCat(false)
    }
  }

  const handleExport = async () => {
    try {
      const { downloadXlsx } = await import('../utils/xlsx')
      const { transactionsSheet } = await import('../utils/reportExport')
      await downloadXlsx([transactionsSheet(transactions as any[])], `budget-${selectedMonth}.xlsx`)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Could not generate the Excel file')
    }
  }

  // Same tested money math as Reports (single source of truth for summing amounts).
  const totals = reportTotals(transactions)
  const stats = { income: totals.income, expenses: totals.expense, net: totals.net }
  // How many transactions in the current month still need a category — drives
  // both the "Categorize uncategorized" button and the queue toggle.
  const uncategorizedCount = (transactions as any[]).filter(isUncategorized).length
  // Search filters the displayed list (monthly totals above stay for the month);
  // the queue toggle narrows it further to only rows needing a category.
  const searched = filterTransactions(transactions as any[], search)
  const filtered = onlyUncategorized ? searched.filter(isUncategorized) : searched
  const totalPages = Math.max(1, Math.ceil(filtered.length / 25))
  // Shared by the mobile card list and the desktop table so the two views
  // can never drift out of sync on paging.
  const pageRows = filtered.slice((page - 1) * 25, page * 25)

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div>
        <h1 className="text-display-lg">Dashboard</h1>
        <p className="mt-2 text-ink-400">Welcome back, {user.name || user.email}</p>
      </div>

      {/* Bank linking + connection management now live on Settings — the
          Dashboard is for reviewing spend, not one-off account setup. */}

      {/* Month Selector */}
      <div className="mt-6 flex items-center gap-2">
        <label className="text-body-sm text-ink-400">Month:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value)
            setPage(1)
          }}
          className="input-base"
        />
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        <div className="card p-4 sm:p-6">
          <p className="text-body-sm text-ink-400">Total Income</p>
          <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-sunset">${stats.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="card p-4 sm:p-6">
          <p className="text-body-sm text-ink-400">Total Expenses</p>
          <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-dusk">${stats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="card p-4 sm:p-6">
          <p className="text-body-sm text-ink-400">Net Income</p>
          <p className="mt-2 text-2xl sm:text-3xl font-normal text-accent-breeze">${stats.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Upcoming recurring bills (renders only if any are due soon) */}
      <UpcomingBills />

      {/* Add Transaction Form */}
      <div className="mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-display-sm">Transactions</h2>
          {/* On phones these are an even 2-up grid rather than free-wrapping
              pills, which left a ragged single button orphaned on its own row.
              The primary action spans the full width above the secondaries. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="btn-primary col-span-2 px-4 sm:col-span-1"
            >
              {formOpen ? 'Cancel' : '+ Add Transaction'}
            </button>
            <button
              onClick={() => setImportOpen(!importOpen)}
              className="btn-secondary px-4"
            >
              {importOpen ? 'Cancel' : '📤 Import CSV'}
            </button>
            {uncategorizedCount > 0 && (
              <button
                onClick={handleAutoCategorize}
                disabled={autoCat}
                className="btn-secondary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Auto-categorize the ${uncategorizedCount} uncategorized transaction${uncategorizedCount === 1 ? '' : 's'} this month`}
              >
                {autoCat ? 'Categorizing…' : `✨ Categorize uncategorized (${uncategorizedCount})`}
              </button>
            )}
            {transactions.length > 0 && (
              <button
                onClick={handleExport}
                className="btn-secondary px-4"
                title="Download this month's transactions as CSV"
              >
                ⬇ Export Excel
              </button>
            )}
          </div>
        </div>

        {importOpen && (
          <div className="mt-6">
            <CSVImport onImportComplete={async () => {
              setImportOpen(false)
              await fetchTransactions()
              // Auto-categorize freshly imported rows so the queue starts clean.
              try {
                const total = await runAutoCategorize()
                if (total > 0) {
                  await fetchTransactions()
                  invalidateCategories()
                  toast.success(`Auto-categorized ${total} imported transaction${total === 1 ? '' : 's'}`)
                }
              } catch (err) {
                console.error('Post-import auto-categorize failed:', err)
              }
            }} />
          </div>
        )}

        {formOpen && (
          <div className="mt-6 card p-6">
            <h3 className="text-lg font-normal text-ink-50 mb-4">
              {editingId ? 'Edit Transaction' : 'Add New Transaction'}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-base"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Category
                  </label>
                  <CategorySelect
                    value={formData.category}
                    onChange={(v) => setFormData({ ...formData, category: v })}
                    categories={categories}
                    ariaLabel="Transaction category"
                    placeholder="Pick or add a category"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Weekly shopping"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    onBlur={suggestCategory}
                    className="input-base"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-body-sm font-normal text-ink-200 mb-2">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Add a note…"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="input-base"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2"
              >
                {submitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Transaction' : 'Add Transaction')}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="mt-8">
        {loading ? (
          <SkeletonTable rows={8} cols={5} />
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No transactions yet"
            description="Start tracking your budget by adding your first transaction"
            action={{ label: '+ Add Transaction', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search transactions by description or category…"
                aria-label="Search transactions"
                className="input-base flex-1"
              />
              <button
                type="button"
                onClick={() => { setOnlyUncategorized((v) => !v); setPage(1) }}
                aria-pressed={onlyUncategorized}
                className={`inline-flex items-center justify-center min-h-touch px-4 text-body-sm rounded-sm border transition-colors ${
                  onlyUncategorized
                    ? 'border-accent-sunset bg-accent-sunset/10 text-accent-sunset'
                    : 'border-ink-700 text-ink-400 hover:text-ink-200'
                }`}
              >
                {onlyUncategorized ? '✓ Only uncategorized' : 'Show only uncategorized'}
              </button>
            </div>
            {filtered.length === 0 ? (
              <div className="card p-8 text-center text-ink-400 mt-4">
                {onlyUncategorized && !search
                  ? 'Everything this month is categorized. 🎉'
                  : <>No transactions match &ldquo;{search}&rdquo;.</>}
              </div>
            ) : (
          <>
          {/* Mobile: a swipeable card list. A horizontally-scrolling table
              would fight the swipe gesture, so phones get cards and pointer
              devices keep the denser table below. */}
          <div className="mt-4 card divide-y divide-ink-700 overflow-hidden sm:hidden">
            {pageRows.map((txn: any) => (
              <SwipeableRow
                key={txn.id}
                open={swipedId === txn.id}
                onOpenChange={(o) => setSwipedId(o ? txn.id : null)}
                actions={[
                  {
                    label: 'Category',
                    icon: <Tag size={16} />,
                    onClick: () => setCategorizing(txn),
                    className: 'bg-accent-sunset',
                  },
                  {
                    label: 'Delete',
                    icon: <Trash2 size={16} />,
                    onClick: () => setShowDeleteConfirm(txn.id),
                    className: 'bg-accent-dusk',
                  },
                ]}
              >
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => handleEditTransaction(txn)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Edit ${txn.description || 'transaction'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-ink-100">{txn.description}</span>
                      {txn.plaidId && (
                        <Landmark size={12} className="shrink-0 text-accent-breeze" aria-label="Synced from your bank" />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-body-sm text-ink-500">
                      {formatDate(txn.date)} · {vendorName(txn.description)}
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={txn.type === 'income' ? 'text-accent-sunset' : 'text-accent-dusk'}>
                      {txn.type === 'income' ? '+' : '-'}${txAmount(txn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {/* Tappable chip — the non-gesture path to recategorizing. */}
                    <button
                      onClick={() => setCategorizing(txn)}
                      className="max-w-[10rem] truncate rounded-pill bg-canvas-soft px-2 py-1 text-body-sm text-ink-400 transition-colors active:bg-ink-700"
                      aria-label={`Change category, currently ${txn.category || 'Uncategorized'}`}
                    >
                      {txn.category || 'Uncategorized'}
                    </button>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>

          <div className="mt-4 hidden table-scroll sm:block">
            <table className="table-minimal">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((txn: any) => (
                  <tr key={txn.id}>
                    <td className="text-ink-300">
                      {formatDate(txn.date)}
                    </td>
                    <td className="text-ink-300">
                      <span className="inline-flex items-center gap-1.5">
                        {txn.description}
                        {txn.plaidId && (
                          <span title="Synced from your bank" className="inline-flex shrink-0">
                            <Landmark size={13} className="text-accent-breeze" aria-label="Synced from your bank" />
                          </span>
                        )}
                      </span>
                      {txn.note && (
                        <span className="block text-body-sm text-ink-500 italic">{txn.note}</span>
                      )}
                    </td>
                    <td className="text-ink-400">{vendorName(txn.description)}</td>
                    <td>
                      <button
                        onClick={() => setCategorizing(txn)}
                        className="rounded-sm px-2 py-1 text-ink-400 underline decoration-dotted decoration-ink-600 underline-offset-4 transition-colors hover:bg-canvas-soft hover:text-ink-200"
                        title="Change category"
                      >
                        {txn.category || 'Uncategorized'}
                      </button>
                    </td>
                    <td className="text-right">
                      <span className={txn.type === 'income' ? 'text-accent-sunset' : 'text-accent-dusk'}>
                        {txn.type === 'income' ? '+' : '-'}${txAmount(txn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    {/* The flex row lives in a wrapper div — putting display:flex
                        on the <td> itself drops it out of the table layout and
                        misaligns the whole row. */}
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditTransaction(txn)}
                          aria-label={`Edit ${txn.description || 'transaction'}`}
                          className="inline-flex items-center justify-center gap-1 min-h-touch px-3 text-body-sm font-normal bg-accent-sunset text-canvas rounded hover:bg-accent-sunset-soft transition-colors"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(txn.id)}
                          aria-label={`Delete ${txn.description || 'transaction'}`}
                          className="inline-flex items-center justify-center gap-1 min-h-touch px-3 text-body-sm font-normal bg-accent-dusk text-canvas rounded hover:bg-purple-700 transition-colors"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
            )}
          </>
        )}

        {filtered.length > 0 && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Transaction?"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => handleDeleteTransaction(showDeleteConfirm!)}
              className="btn-primary flex-1 bg-accent-dusk hover:bg-purple-700"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-ink-300">
          Are you sure you want to delete this transaction? This cannot be undone.
        </p>
      </Modal>

      {categorizing && (
        <QuickCategorySheet
          current={categorizing.category || 'Uncategorized'}
          categories={categories}
          title={categorizing.description || 'Transaction'}
          onPick={(c) => handleQuickCategory(categorizing, c)}
          onClose={() => setCategorizing(null)}
        />
      )}
    </div>
  )
}
