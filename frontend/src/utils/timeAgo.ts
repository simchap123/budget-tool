// Compact relative time ("just now", "5m ago", "3h ago", "2d ago") from a
// timestamp string. `now` is injectable so it's deterministically testable.
// Accepts PocketBase's "YYYY-MM-DD HH:MM:SS.sssZ" (space) or ISO ("T") form.
export function timeAgo(value: string, now: number = Date.now()): string {
  if (!value) return ''
  const t = new Date(String(value).replace(' ', 'T')).getTime()
  if (isNaN(t)) return ''
  const s = Math.max(0, Math.floor((now - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
