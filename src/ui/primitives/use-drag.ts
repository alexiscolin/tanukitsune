'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

// Far enough that a scroll or a mistouch does not commit, close enough to reach with a thumb
// without repositioning the hand.
export const THRESHOLD = 96

// The pull is horizontal, so vertical movement is followed at a quarter of its distance: the
// card stays under the finger without turning the gesture into a free drag.
const VERTICAL_FOLLOW = 0.25

// Enough to leave the viewport at any width the catalogue opens at.
const EXIT = 520

export type SwipeDirection = 'left' | 'right'

// The gesture, kept apart from what is drawn: the deck that spends this only reads the numbers
// it returns and never touches a pointer event of its own.
export function useDrag(onDecide: (direction: SwipeDirection) => void, disabled?: boolean) {
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [exiting, setExiting] = useState(false)
  // Held as state rather than only on the ref, because the card follows the finger with no
  // transition and eases back with one, and that is a decision taken while rendering.
  const [dragging, setDragging] = useState(false)
  const origin = useRef<{ x: number; y: number } | null>(null)

  // The exit runs on a timer, so a screen left mid-swipe would otherwise keep the deck's
  // setters and the caller's `onDecide` alive until it fires.
  const exit = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (exit.current !== null) window.clearTimeout(exit.current)
    },
    [],
  )

  const commit = useCallback(
    (direction: SwipeDirection) => {
      setExiting(true)
      setDrag({ x: direction === 'right' ? EXIT : -EXIT, y: 0 })
      exit.current = window.setTimeout(() => {
        exit.current = null
        setExiting(false)
        setDrag({ x: 0, y: 0 })
        onDecide(direction)
      }, 320)
    },
    [onDecide],
  )

  function down(event: PointerEvent<HTMLDivElement>) {
    if (disabled === true || exiting) return
    event.currentTarget.setPointerCapture(event.pointerId)
    origin.current = { x: event.clientX, y: event.clientY }
    setDragging(true)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (origin.current === null || exiting) return
    setDrag({
      x: event.clientX - origin.current.x,
      y: (event.clientY - origin.current.y) * VERTICAL_FOLLOW,
    })
  }

  function up() {
    if (origin.current === null || exiting) return
    origin.current = null
    setDragging(false)
    if (drag.x > THRESHOLD) commit('right')
    else if (drag.x < -THRESHOLD) commit('left')
    else setDrag({ x: 0, y: 0 })
  }

  // The arrow keys reach the same outcomes, because a gesture nobody can perform without a
  // pointer is a control a keyboard reader does not have at all.
  //
  // Only when the deck itself holds the focus. What the deck draws is a caller's, and a text
  // field among it takes the same two keys to move a caret: those presses bubble here, and
  // grading on them would rule on an answer the reader was still reading. Handled keys are
  // stopped as well, or the page scrolls under the card that is leaving.
  function arrows(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled === true || exiting) return
    if (event.target !== event.currentTarget) return
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return

    event.preventDefault()
    commit(event.key === 'ArrowRight' ? 'right' : 'left')
  }

  return { drag, exiting, dragging, down, move, up, arrows }
}
