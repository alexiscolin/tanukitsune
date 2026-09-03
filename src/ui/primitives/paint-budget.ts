'use client'

import { CARD_PAINTED, PAINT_SPAN, VERDICT_DECIDED } from '@/core/paint-budget'

// The two ends of the paint budget, laid on the timeline the browser already keeps. Marks rather than
// a stopwatch of our own: the profiler and the suite both read that timeline, so a span recorded here
// is one somebody can go and look at rather than a number this code reports about itself.

export function markVerdict(): void {
  performance.mark(VERDICT_DECIDED)
}

// The far end, and the near one is cleared with it: a card is measured against the verdict that
// opened it, and a mark left behind would measure the next card against this one. Nothing is measured
// where no verdict was decided, which is a lesson and a card revealed again rather than a slow paint.
export function markCardPainted(): void {
  if (performance.getEntriesByName(VERDICT_DECIDED, 'mark').length === 0) return

  performance.mark(CARD_PAINTED)
  performance.measure(PAINT_SPAN, VERDICT_DECIDED, CARD_PAINTED)
  performance.clearMarks(VERDICT_DECIDED)
}
