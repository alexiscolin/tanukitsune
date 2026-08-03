'use client'

import type { ReactNode } from 'react'

import { ScreenShell } from '@/ui/atoms/screen-shell'
import { SessionRule } from '@/ui/atoms/session-rule'
import { SessionHeader } from '@/ui/molecules/session-header'
import type { StripItem } from '@/ui/molecules/deck-strip'

// The shape a session has whatever it is asking: the queue at the top, the deck in the middle,
// and the rule flush with the bottom of the screen. A lesson and a review differ in what they
// deal onto that stage and in nothing around it.
//
// The band the deck is dealt in is two boxes rather than one: the outer takes what the column
// has left and keeps the safe area clear, the inner gives the deck a used height to position
// itself against, which a percentage cannot resolve on a box sized by flex.
export function SessionScreen({
  queue,
  index,
  done,
  missed,
  announce,
  children,
}: {
  queue: readonly StripItem[]
  index: number
  // What the rule at the foot draws, which is not the position in the queue: a card answered
  // wrongly is a step through the deck and not a step of progress.
  done: number
  missed: number
  // The polite region a screen that grades owes a reader who cannot see the card. A lesson
  // rules on nothing and passes none.
  announce?: ReactNode
  children: ReactNode
}) {
  return (
    <ScreenShell>
      <SessionHeader queue={queue} index={index} />

      {announce}

      <div className="pb-safe relative flex min-h-0 flex-1 flex-col pt-3">
        <div className="relative min-h-0 flex-1">{children}</div>
      </div>

      <SessionRule done={done} missed={missed} total={queue.length} />
    </ScreenShell>
  )
}
