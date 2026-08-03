'use client'

import type { ReactNode } from 'react'

// The label over a value, in small capitals, and behind what it qualifies: a heading that reads
// as loud as the line under it stops being a label.
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="eyebrow text-[var(--color-ink-muted)] transition-colors duration-500">
      {children}
    </span>
  )
}
