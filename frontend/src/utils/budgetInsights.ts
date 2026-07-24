// Insights that make the Budget page richer: what vendors make up a category's
// spend, and how much of each category is committed to recurring charges. Pure
// and tested so the Budget UI stays a thin renderer.
import { merchantKey } from './merchant'
import { txAmount } from './reportStats'
import { detectRecurring, RawTxn } from './recurring'

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

export interface VendorSpend {
  key: string // merchant key (for recurring flagging)
  label: string
  spent: number
}

// Vendors that make up one category's spend, biggest first. Used for the
// per-category "thermometer by vendor" breakdown.
export function vendorSpendInCategory(txns: any[], category: string): VendorSpend[] {
  const acc: Record<string, number> = {}
  for (const t of txns) {
    if (t.type !== 'expense') continue
    if ((t.category || 'Uncategorized') !== category) continue
    const k = merchantKey(t.description || '')
    acc[k] = (acc[k] || 0) + txAmount(t)
  }
  return Object.entries(acc)
    .map(([key, spent]) => ({ key, label: titleCase(key), spent }))
    .sort((a, b) => b.spent - a.spent)
}

export interface CategoryRecurring {
  monthly: number // estimated recurring $ per month in this category
  vendors: { key: string; label: string; monthly: number }[]
}

// Dominant category for each merchant key, by how often it's used on that
// merchant's transactions (a merchant like Amazon can span categories).
function dominantCategoryByKey(txns: RawTxn[]): Record<string, string> {
  const counts: Record<string, Record<string, number>> = {}
  for (const t of txns) {
    if (t.type !== 'expense') continue
    const k = merchantKey(t.description)
    const c = t.category || 'Uncategorized'
    if (!counts[k]) counts[k] = {}
    counts[k][c] = (counts[k][c] || 0) + 1
  }
  const out: Record<string, string> = {}
  for (const k of Object.keys(counts)) {
    let best = 'Uncategorized'
    let n = 0
    for (const c of Object.keys(counts[k])) {
      if (counts[k][c] > n) {
        n = counts[k][c]
        best = c
      }
    }
    out[k] = best
  }
  return out
}

// Recurring monthly commitment grouped by the category each recurring merchant
// most often lands in. `txns` should span several months so detection works.
export function recurringByCategory(txns: RawTxn[]): Record<string, CategoryRecurring> {
  const items = detectRecurring(txns)
  const catByKey = dominantCategoryByKey(txns)
  const out: Record<string, CategoryRecurring> = {}
  for (const it of items) {
    const cat = catByKey[it.key] || 'Uncategorized'
    if (!out[cat]) out[cat] = { monthly: 0, vendors: [] }
    out[cat].monthly += it.monthlyEstimate
    out[cat].vendors.push({ key: it.key, label: it.label, monthly: it.monthlyEstimate })
  }
  return out
}

// The set of merchant keys detected as recurring - for flagging a vendor row
// with a 🔁 in the breakdown.
export function recurringKeySet(txns: RawTxn[]): Set<string> {
  return new Set(detectRecurring(txns).map((i) => i.key))
}

// Total estimated recurring spend per month across everything.
export function totalMonthlyRecurring(txns: RawTxn[]): number {
  return detectRecurring(txns).reduce((s, i) => s + i.monthlyEstimate, 0)
}

// Split a category budget into its committed (recurring/fixed) part and the
// flexible remainder you actually steer. `over` is how much recurring exceeds
// the budget (i.e. the budget doesn't even cover the fixed charges).
export function fixedFlexible(budget: number, recurring: number): { fixed: number; flexible: number; over: number } {
  const fixed = Math.max(0, Math.min(recurring, budget))
  const flexible = Math.max(0, budget - recurring)
  const over = Math.max(0, recurring - budget)
  return { fixed, flexible, over }
}
