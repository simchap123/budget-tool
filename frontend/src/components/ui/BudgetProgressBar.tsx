import { budgetPercent, budgetBarColor } from '../../utils/budgetBar'

interface BudgetProgressBarProps {
  spent: number
  budgeted: number
  color?: string
}

export function BudgetProgressBar({ spent, budgeted, color = '#ff7a17' }: BudgetProgressBarProps) {
  const percentage = budgetPercent(spent, budgeted)
  const barColor = budgetBarColor(percentage, color)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-body-sm text-ink-300">
            ${spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${budgeted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <span className="text-body-sm font-normal text-ink-400">
          {percentage.toLocaleString('en-US', { maximumFractionDigits: 0 })}%
        </span>
      </div>
      <div className="w-full h-2 bg-canvas-soft rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}
