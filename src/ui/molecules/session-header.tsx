'use client'

import { MenuMark } from '@/ui/atoms/menu-mark'
import { StepCount } from '@/ui/atoms/step-count'
import { DeckStrip } from '@/ui/molecules/deck-strip'
import type { StripItem } from '@/ui/molecules/deck-strip'

// The mark and the counter on one row, the deck on a band of its own under them. The deck is
// read across rather than glanced at, which is what a row squeezed between two fixed things
// cannot be.
//
// The total is the queue's own length rather than a number beside it: a counter that can
// disagree with the strip under it is a counter nobody can trust.
export function SessionHeader({ queue, index }: { queue: readonly StripItem[]; index: number }) {
  return (
    <>
      <header className="pt-safe flex items-start justify-between gap-4">
        <MenuMark />
        <StepCount step={index + 1} total={queue.length} />
      </header>
      <DeckStrip queue={queue} index={index} />
    </>
  )
}
