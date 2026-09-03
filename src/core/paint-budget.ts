// The budget v0.1 sets on the item card: a wrong answer shows it in under a tenth of a second at the
// ninety-fifth percentile, measured from the verdict being decided to the card being painted. A
// number nobody measures is a number nobody keeps, so the two ends are marked on the timeline the
// browser already keeps and the end-to-end suite reads the span between them.
//
// The names are here rather than in the screen, because the suite reads them from outside the bundle
// and a string spelled twice is a measurement that silently stops existing.
export const VERDICT_DECIDED = 'verdict-decided'
export const CARD_PAINTED = 'card-painted'
export const PAINT_BUDGET = 100

// Absent in a server render and in any runtime without the timeline. Nothing here is load-bearing:
// a screen that cannot be measured still works, and the suite is what refuses a missing measurement.
function timeline(): Performance | null {
  return typeof performance === 'undefined' ? null : performance
}

export function markVerdict(): void {
  timeline()?.mark(VERDICT_DECIDED)
}

// The end of the span, and the start is cleared with it: a card is measured against the verdict that
// opened it, and a mark left behind would measure the next card against this one. Nothing is measured
// where no verdict was decided, which is a lesson and a card revealed again rather than a slow paint.
export function markCardPainted(): void {
  const clock = timeline()
  if (clock === null || clock.getEntriesByName(VERDICT_DECIDED, 'mark').length === 0) return

  clock.measure(CARD_PAINTED, VERDICT_DECIDED)
  clock.clearMarks(VERDICT_DECIDED)
}
