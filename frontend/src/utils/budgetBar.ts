// Share of a budget that's been spent, clamped to 0–100. Guards against a zero
// budget (no divide-by-zero - an unset budget reads as 0% spent).
export function budgetPercent(spent: number, budgeted: number): number {
  return budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
}

// Bar color for a spend percentage: red at/over budget, amber in the last 10%,
// otherwise the category's base color.
export function budgetBarColor(percentage: number, base: string): string {
  if (percentage >= 100) return '#f87171'
  if (percentage >= 90) return '#fbbf24'
  return base
}
