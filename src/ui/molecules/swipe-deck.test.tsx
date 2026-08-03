import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SwipeDeck } from './swipe-deck'

// The gesture is the whole grading control: there is no button and no grading bar, so what
// commits and what does not is the difference between a card graded and a card the reader was
// still reading. Driven through the deck rather than through the hook, because the distances
// only mean anything against a pointer that moved.

// jsdom implements no pointer capture, and the deck takes it so the card keeps following a
// finger that leaves its box.
beforeEach(() => {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    value: () => {},
    configurable: true,
  })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(Element.prototype, 'setPointerCapture')
  cleanup()
})

const LABEL = 'grade this card'

function deck(onDecide: (direction: 'left' | 'right') => void, disabled?: boolean) {
  render(
    <SwipeDeck cardKey="one" label={LABEL} onDecide={onDecide} disabled={disabled}>
      <input aria-label="answer" />
    </SwipeDeck>,
  )

  return screen.getByRole('group', { name: LABEL })
}

// The card leaves on a timer before the caller is told, so nothing is decided until it has.
function pullBy(group: HTMLElement, x: number) {
  fireEvent.pointerDown(group, { clientX: 0, clientY: 0, pointerId: 1 })
  fireEvent.pointerMove(group, { clientX: x, clientY: 0, pointerId: 1 })
  fireEvent.pointerUp(group, { pointerId: 1 })
  act(() => {
    vi.advanceTimersByTime(400)
  })
}

describe('SwipeDeck, by pointer', () => {
  it('says nothing when the pull stops short of committing', () => {
    const decided = vi.fn()

    pullBy(deck(decided), 80)

    expect(decided).not.toHaveBeenCalled()
  })

  it('grades right once the pull has gone far enough', () => {
    const decided = vi.fn()

    pullBy(deck(decided), 120)

    expect(decided).toHaveBeenCalledWith('right')
  })

  it('grades left on the same distance the other way', () => {
    const decided = vi.fn()

    pullBy(deck(decided), -120)

    expect(decided).toHaveBeenCalledWith('left')
  })

  it('ignores a pull while there is nothing to grade', () => {
    const decided = vi.fn()

    pullBy(deck(decided, true), 200)

    expect(decided).not.toHaveBeenCalled()
  })
})

describe('SwipeDeck, by keyboard', () => {
  it('grades right, since a gesture needs a pointer and a reader may have none', () => {
    const decided = vi.fn()
    const group = deck(decided)

    fireEvent.keyDown(group, { key: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(decided).toHaveBeenCalledWith('right')
  })

  // Both outcomes, or the keyboard reaches only the half of the loop that says an answer stood.
  it('grades left too', () => {
    const decided = vi.fn()
    const group = deck(decided)

    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(decided).toHaveBeenCalledWith('left')
  })

  // The same two keys move a caret, and those presses bubble up to the deck. Grading on one
  // would rule on an answer the reader was still writing.
  it('leaves an arrow pressed inside the card to the card', () => {
    const decided = vi.fn()
    deck(decided)

    fireEvent.keyDown(screen.getByLabelText('answer'), { key: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(decided).not.toHaveBeenCalled()
  })

  it('ignores a key while there is nothing to grade', () => {
    const decided = vi.fn()
    const group = deck(decided, true)

    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(decided).not.toHaveBeenCalled()
  })
})
