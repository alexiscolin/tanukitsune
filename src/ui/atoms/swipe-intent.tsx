'use client'

import type { SwipeDirection } from '@/ui/primitives/use-drag'

// The two verdicts sit behind the card and surface as it is pulled toward one, so the reader
// reads what they are about to say before they commit to saying it. Which one, and how far, are
// the gesture's to say: this only draws them.
export function SwipeIntent({
  left,
  right,
  toward,
  reached,
}: {
  left: string
  right: string
  toward: SwipeDirection | null
  reached: number
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1">
      <span
        className="eyebrow text-[var(--color-ink-muted)] transition-opacity duration-200"
        style={{ opacity: toward === 'left' ? reached : 0 }}
      >
        {left}
      </span>
      <span
        className="eyebrow text-[var(--color-brand)] transition-opacity duration-200"
        style={{ opacity: toward === 'right' ? reached : 0 }}
      >
        {right}
      </span>
    </div>
  )
}
