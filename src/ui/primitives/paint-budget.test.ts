import { beforeEach, describe, expect, it } from 'vitest'

import { CARD_PAINTED, PAINT_BUDGET, PAINT_SPAN, VERDICT_DECIDED } from '@/core/paint-budget'
import { markCardPainted, markVerdict } from './paint-budget'

describe('the paint budget', () => {
  beforeEach(() => {
    performance.clearMarks()
    performance.clearMeasures()
  })

  it('marks both ends and measures the span between them', () => {
    markVerdict()
    markCardPainted()

    const [measured] = performance.getEntriesByName(PAINT_SPAN, 'measure')

    expect(performance.getEntriesByName(CARD_PAINTED, 'mark')).toHaveLength(1)
    expect(measured).toBeDefined()
    expect(measured?.duration).toBeLessThan(PAINT_BUDGET)
  })

  // A lesson opens its card with nothing decided, and so does a card revealed a second time. There
  // is no span to measure and nothing was slow: a measure written from a missing mark would read as
  // the whole time the tab has been open.
  it('measures nothing where no verdict was decided', () => {
    markCardPainted()

    expect(performance.getEntriesByName(PAINT_SPAN, 'measure')).toHaveLength(0)
  })

  // One card at a time. A run that kept the near mark would measure the newest card against the
  // oldest verdict, since a measure names its marks rather than the pair the caller meant.
  it('measures each card against the verdict that opened it', () => {
    markVerdict()
    markCardPainted()
    markVerdict()
    markCardPainted()

    expect(performance.getEntriesByName(PAINT_SPAN, 'measure')).toHaveLength(2)
    expect(performance.getEntriesByName(VERDICT_DECIDED, 'mark')).toHaveLength(0)
  })
})
