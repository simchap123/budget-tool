import { useState } from 'react'

const ADD = '__add_new__'

// A category dropdown of the user's existing categories, with a "New category…"
// option that switches to a text input so new categories can still be created.
export function CategorySelect({
  value,
  onChange,
  categories,
  className = 'input-base',
  ariaLabel = 'Category',
  allowNew = true,
  placeholder = 'Select category…',
}: {
  value: string
  onChange: (v: string) => void
  categories: string[]
  className?: string
  ariaLabel?: string
  allowNew?: boolean
  placeholder?: string
}) {
  // Custom mode = typing a brand-new category not in the list.
  const [custom, setCustom] = useState(false)

  if (custom) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="New category name"
          aria-label={ariaLabel}
          autoFocus
          className={className}
        />
        <button
          type="button"
          onClick={() => { setCustom(false); onChange('') }}
          className="shrink-0 text-body-sm text-ink-400 hover:text-ink-200"
          title="Back to the list"
        >
          ↩
        </button>
      </div>
    )
  }

  const known = categories.includes(value)
  return (
    <select
      value={known ? value : ''}
      onChange={(e) => {
        if (e.target.value === ADD) {
          setCustom(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
      aria-label={ariaLabel}
      className={className}
    >
      <option value="">{placeholder}</option>
      {/* keep a current value that isn't in the list (e.g. legacy) selectable */}
      {value && !known && <option value={value}>{value}</option>}
      {categories.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
      {allowNew && <option value={ADD}>➕ New category…</option>}
    </select>
  )
}
