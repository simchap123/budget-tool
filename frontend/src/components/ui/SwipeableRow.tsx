import { ReactNode, useRef, useState } from 'react'

export interface SwipeAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  /** Background colour classes for the action panel button. */
  className?: string
}

// A row that slides left to reveal actions behind it (iOS-mail style).
//
// Gesture handling notes:
//  - `touch-action: pan-y` lets the browser keep ownership of vertical
//    scrolling while giving us horizontal movement. Without it the row would
//    either swallow page scroll or never receive the horizontal drag.
//  - We only start translating once the gesture is clearly horizontal, so a
//    slightly-diagonal scroll doesn't twitch the row sideways.
//  - Opening is controlled by the parent so that opening one row closes any
//    other — two rows open at once reads as broken.
export function SwipeableRow({
  actions,
  open,
  onOpenChange,
  children,
}: {
  actions: SwipeAction[]
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const [dragX, setDragX] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided')

  const panelWidth = () => panelRef.current?.offsetWidth ?? 0

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
    axis.current = 'undecided'
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return
    const t = e.touches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y

    if (axis.current === 'undecided') {
      // Need a few pixels of travel before committing to an axis.
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }
    if (axis.current !== 'horizontal') return

    const base = open ? -panelWidth() : 0
    // Clamp: can't drag past the actions, and only a little rubber-band right.
    const next = Math.max(-panelWidth(), Math.min(8, base + dx))
    setDragX(next)
  }

  const onTouchEnd = () => {
    if (axis.current === 'horizontal' && dragX !== null) {
      // Past the halfway point commits to the new state.
      onOpenChange(dragX < -panelWidth() / 2)
    }
    setDragX(null)
    start.current = null
    axis.current = 'undecided'
  }

  const offset = dragX !== null ? dragX : open ? -panelWidth() : 0

  return (
    <div className="relative overflow-hidden">
      {/* Action panel sits behind the content and is revealed as it slides. */}
      <div ref={panelRef} className="absolute inset-y-0 right-0 flex">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => {
              onOpenChange(false)
              a.onClick()
            }}
            // Hidden from the a11y tree while closed so screen-reader and
            // keyboard users don't land on buttons they can't see.
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            className={`flex min-h-touch w-20 flex-col items-center justify-center gap-1 text-body-sm text-canvas ${a.className || 'bg-ink-600'}`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          // Follow the finger 1:1 while dragging; animate only on release.
          transition: dragX === null ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        className="relative bg-canvas-card"
      >
        {children}
      </div>
    </div>
  )
}
