'use client'

import type { ReactNode } from 'react'

// The one raised-in-reverse surface the card has: a well, sunk into the slab rather than
// lifted off it, so the two blocks that explain the character rather than state a fact about
// it are found while scrolling instead of being read for. It is the only place in the
// interface where anything is enclosed, and it encloses exactly one thing.
export function Well({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-[var(--color-surface-sunken)] p-5">
      {children}
    </div>
  )
}
