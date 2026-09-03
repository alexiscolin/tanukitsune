import { beforeEach, describe, expect, it } from 'vitest'

import { CARD_PAINTED, markCardPainted, markVerdict, PAINT_BUDGET, VERDICT_DECIDED } from './paint-budget'

describe('the paint budget', () => {
  beforeEach(() => {
    performance.clearMarks()
    performance.clearMeasures()
  })

  it('measures from the verdict to the card', () => {
    markVerdict()
    markCardPainted()

    const [measured] = performance.getEntriesByName(CARD_PAINTED, 'measure')

    expect(measured).toBeDefined()
    expect(measured?.duration).toBeLessThan(PAINT_BUDGET)
  })

  // A lesson opens its card with nothing decided, and so does a card revealed a second time. There
  // is no span to measure and nothing was slow: a measure written from a missing mark would read as
  // the whole time the tab has been open.
  it('measures nothing where no verdict was decided', () => {
    markCardPainted()

    expect(performance.getEntriesByName(CARD_PAINTED, 'measure')).toHaveLength(0)
  })

  // One card at a time. A run that kept every mark would measure the newest card against the oldest
  // verdict, since a measure names its marks rather than the pair the caller meant.
  it('measures one card against the verdict that opened it', () => {
    markVerdict()
    markCardPainted()
    markVerdict()
    markCardPainted()

    expect(performance.getEntriesByName(CARD_PAINTED, 'measure')).toHaveLength(2)
    expect(performance.getEntriesByName(VERDICT_DECIDED, 'mark')).toHaveLength(0)
  })
})
