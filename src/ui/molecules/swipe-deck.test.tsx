import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SwipeDeck } from './swipe-deck'

// The gesture is the whole grading control: there is no button and no grading bar, so what
// commits and what does not is the difference between a card graded and a card the reader was
// still reading. Driven through the deck rather than through the hook, because the distances
// only mean anything against a pointer that moved, and because the rule that leaves an arrow
// to the field under it reads the event's target.

// jsdom implements no pointer capture, and the deck takes it so the card keeps following a
// finger that leaves its box. One value for the file, since no test varies it.
Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: () => {},
  configurable: true,
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const LABEL = 'grade this card'

function deck(disabled?: boolean) {
  const decided = vi.fn()

  render(
    <SwipeDeck cardKey="one" label={LABEL} onDecide={decided} disabled={disabled}>
      <input aria-label="answer" />
    </SwipeDeck>,
  )

  return { group: screen.getByRole('group', { name: LABEL }), decided }
}

// The card leaves before the caller is told, so nothing is decided until it has. Run rather
// than advanced by a number, since how long it takes to leave is a feel and not a contract.
function landed() {
  act(() => {
    vi.runAllTimers()
  })
}

function pullBy(group: HTMLElement, x: number) {
  fireEvent.pointerDown(group, { clientX: 0, clientY: 0, pointerId: 1 })
  fireEvent.pointerMove(group, { clientX: x, clientY: 0, pointerId: 1 })
  fireEvent.pointerUp(group, { pointerId: 1 })
}

describe('SwipeDeck, by pointer', () => {
  it('says nothing when the pull stops short of committing', () => {
    const { group, decided } = deck()

    pullBy(group, 80)
    landed()

    expect(decided).not.toHaveBeenCalled()
  })

  it('grades right once the pull has gone far enough', () => {
    const { group, decided } = deck()

    pullBy(group, 120)
    landed()

    expect(decided).toHaveBeenCalledWith('right')
  })

  it('grades left on the same distance the other way', () => {
    const { group, decided } = deck()

    pullBy(group, -120)
    landed()

    expect(decided).toHaveBeenCalledWith('left')
  })

  // A card that has been graded is already leaving, and a second pull landing on it would
  // grade the card behind it on an answer nobody read.
  it('takes one verdict from a card, however many times it is pulled', () => {
    const { group, decided } = deck()

    pullBy(group, 120)
    pullBy(group, -120)
    landed()

    expect(decided).toHaveBeenCalledOnce()
  })

  it('ignores a pull while there is nothing to grade', () => {
    const { group, decided } = deck(true)

    pullBy(group, 200)
    landed()

    expect(decided).not.toHaveBeenCalled()
  })
})

describe('SwipeDeck, by keyboard', () => {
  it('grades right, since a gesture needs a pointer and a reader may have none', () => {
    const { group, decided } = deck()

    fireEvent.keyDown(group, { key: 'ArrowRight' })
    landed()

    expect(decided).toHaveBeenCalledWith('right')
  })

  it('grades left on the other arrow', () => {
    const { group, decided } = deck()

    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    landed()

    expect(decided).toHaveBeenCalledWith('left')
  })

  // The same two keys move a caret, and those presses bubble up to the deck. Grading on one
  // would rule on an answer the reader was still writing.
  it('leaves an arrow pressed inside the card to the card', () => {
    const { decided } = deck()

    fireEvent.keyDown(screen.getByLabelText('answer'), { key: 'ArrowRight' })
    landed()

    expect(decided).not.toHaveBeenCalled()
  })

  it('ignores a key while there is nothing to grade', () => {
    const { group, decided } = deck(true)

    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    landed()

    expect(decided).not.toHaveBeenCalled()
  })
})
