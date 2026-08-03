import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SessionRule } from './session-rule'

afterEach(cleanup)

// Three quantities on one hairline, with no label, no legend and no digit: the width is the
// quantity and the colour says which. So the shares are the whole of what this says, and a
// share computed wrong is a bar that lies with nothing on screen to contradict it.

// The bands are hidden from the accessibility tree, which is why they are read off the
// transforms rather than found by role: each is scaled to its share and slid past the one
// before it. Read as numbers rather than as the string, because the last share is the
// remainder of two divisions and lands a fraction of a fraction away from zero.
function bandsOf(container: HTMLElement): { offset: number; scale: number }[] {
  return [...container.querySelectorAll('span')].map((band) => {
    const [offset, scale] = band.style.transform.match(/-?[\d.e-]+(?=%|\))/g) ?? []

    return { offset: Number(offset), scale: Number(scale) }
  })
}

describe('SessionRule', () => {
  it('draws nothing but the rest of the deck before anything is answered', () => {
    const [passed, missed, rest] = bandsOf(
      render(<SessionRule done={0} missed={0} total={20} />).container,
    )

    expect(passed?.scale).toBe(0)
    expect(missed?.scale).toBe(0)
    expect(rest).toEqual({ offset: 0, scale: 1 })
  })

  it('slides each band past the one before it', () => {
    const [passed, missed, rest] = bandsOf(
      render(<SessionRule done={8} missed={2} total={20} />).container,
    )

    expect(passed).toEqual({ offset: 0, scale: 0.4 })
    expect(missed).toEqual({ offset: 40, scale: 0.1 })
    expect(rest).toEqual({ offset: 50, scale: 0.5 })
  })

  it('leaves nothing over once every card has been answered', () => {
    const [, , rest] = bandsOf(render(<SessionRule done={17} missed={3} total={20} />).container)

    expect(rest?.offset).toBe(100)
    expect(rest?.scale).toBeCloseTo(0)
  })

  // A deck of one is where a share is the whole bar rather than a fraction of it.
  it('gives the whole bar to a deck of one', () => {
    const [passed, missed, rest] = bandsOf(
      render(<SessionRule done={0} missed={1} total={1} />).container,
    )

    expect(passed).toEqual({ offset: 0, scale: 0 })
    expect(missed).toEqual({ offset: 0, scale: 1 })
    expect(rest).toEqual({ offset: 100, scale: 0 })
  })

  // A deck that arrived empty would divide by nothing, and three bands scaled by NaN is a bar
  // painted at full width in whichever colour lands last.
  it('divides by one rather than by nothing on an empty deck', () => {
    const [passed, missed, rest] = bandsOf(
      render(<SessionRule done={0} missed={0} total={0} />).container,
    )

    expect(passed?.scale).toBe(0)
    expect(missed?.scale).toBe(0)
    expect(rest).toEqual({ offset: 0, scale: 1 })
  })

  // The rest is floored rather than allowed to go negative, since a caller counting a card
  // twice would otherwise slide the last band backwards across the ones before it.
  it('never gives the rest a negative share', () => {
    const [, , rest] = bandsOf(render(<SessionRule done={12} missed={12} total={20} />).container)

    expect(rest?.scale).toBe(0)
  })
})
