'use client'

import type { ReactNode } from 'react'

// Depth without a shadow stack: the next card, barely there, and rising into place as the one
// in front is pulled away. It arrives rather than appearing, so the deck reads as one object
// being dealt from and never as two cards swapping. Same rule as the card in front on the
// transition: none while the finger is down, so it tracks rather than lags.
export function DeckBehind({
  reached,
  dragging,
  children,
}: {
  reached: number
  dragging: boolean
  children: ReactNode
}) {
  return (
    <div
      aria-hidden
      // Beside the hiding rather than instead of it: `aria-hidden` promises what is behind is
      // not there, and only `inert` keeps the tab order from walking into it and proving
      // otherwise. The deck cannot know what a caller draws here, and a lesson draws its next
      // card open, sheet and scroll and tab stop included.
      inert
      className="absolute inset-0 origin-bottom"
      style={{
        transform: `scale(${0.965 + 0.035 * reached}) translateY(${10 * (1 - reached)}px)`,
        opacity: 0.4 + 0.6 * reached,
        transition: dragging
          ? 'none'
          : 'transform 0.42s var(--ease-out-soft), opacity 0.42s var(--ease-out-soft)',
      }}
    >
      {children}
    </div>
  )
}
