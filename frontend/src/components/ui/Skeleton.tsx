export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4 w-full rounded-sm"
          style={{ width: `${85 + Math.random() * 15}%` }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="skeleton h-6 w-24 rounded-sm" />
      <div className="skeleton h-12 w-full rounded-sm" />
    </div>
  )
}

export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-ink-700 bg-canvas-card">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4">
                <div className="skeleton h-4 w-20 rounded-sm" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-ink-700">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="p-4">
                  <div className="skeleton h-4 w-full rounded-sm" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
