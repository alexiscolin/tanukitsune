'use client'

import type { ReactNode } from 'react'

// The band the deck is dealt in, between the header and the rule at the foot. Two boxes rather
// than one: the outer takes what the column has left and keeps the safe area clear, the inner
// gives the deck a used height to position itself against, which a percentage cannot resolve
// on a box sized by flex.
export function SessionStage({ children }: { children: ReactNode }) {
  return (
    <div className="pb-safe relative flex min-h-0 flex-1 flex-col pt-3">
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}
