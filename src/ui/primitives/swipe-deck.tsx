'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'

// The review gesture of the reference, and the whole grading control: no buttons and no
// grading bar. The card is judged by being dragged sideways, it tilts and dims as it goes,
// and the verdict it is heading for surfaces behind it.
//
// It grades to the same two outcomes the cascade already produces, so nothing about the
// verdict this reports is new: right is the answer the reader says was right, left is the one
// they say was wrong. A lesson pages through the same deck and judges nothing, which is why
// the two labels are optional.

// Far enough that a scroll or a mistouch does not commit, close enough to reach with a thumb
// without repositioning the hand.
const THRESHOLD = 96

// The pull is horizontal, so vertical movement is followed at a quarter of its distance: the
// card stays under the finger without turning the gesture into a free drag.
const VERTICAL_FOLLOW = 0.25

// Enough to leave the viewport at any width the catalogue opens at.
const EXIT = 520

// The tilt, in degrees per pixel of pull, expressed as its divisor.
const TILT = 26

const INTENT = 24

export type SwipeDirection = 'left' | 'right'

// The gesture, kept apart from what is drawn: the deck below only reads the numbers this
// returns and never touches a pointer event of its own.
function useDrag(onDecide: (direction: SwipeDirection) => void, disabled?: boolean) {
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

export function SwipeDeck({
  cardKey,
  onDecide,
  leftLabel,
  rightLabel,
  label,
  disabled,
  behind,
  children,
}: {
  // What identifies the card in front. Both layers are keyed on it, so the moment the deck
  // advances they are new nodes rather than the old ones re-styled. Without it the node that
  // just left at five hundred pixels is reused for the card arriving, and the transition
  // still on it plays that distance backwards: the next card slides in from the edge instead
  // of already being there, which is the one thing a deck must never do.
  cardKey: string
  onDecide: (direction: SwipeDirection) => void
  // Absent when the two directions mean the same thing, which is what a batch of lessons is:
  // the deck is paged through and nothing is judged, so nothing should surface behind the
  // card to say what it is about to be judged as.
  leftLabel?: string
  rightLabel?: string
  label: string
  disabled?: boolean
  behind?: ReactNode
  children: ReactNode
}) {
  const { drag, exiting, dragging, down, move, up, arrows } = useDrag(onDecide, disabled)
  const reached = Math.min(Math.abs(drag.x) / THRESHOLD, 1)

  // Positioned rather than sized: the caller's box takes its height from flex, which is a
  // used height and not a declared one, so a percentage height here resolves against nothing
  // and the deck collapses to zero.
  return (
    <div className="absolute inset-0">
      {leftLabel === undefined || rightLabel === undefined ? null : (
        <Intent left={leftLabel} right={rightLabel} pull={drag.x} reached={reached} />
      )}

      {behind === undefined ? null : (
        <Behind key={`behind-${cardKey}`} reached={reached} dragging={dragging}>
          {behind}
        </Behind>
      )}

      <div
        key={`front-${cardKey}`}
        role="group"
        tabIndex={0}
        aria-label={label}
        aria-disabled={disabled || undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={arrows}
        className={`absolute inset-0 touch-none rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-canvas)] ${
          disabled === true ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{
          transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / TILT}deg)`,
          opacity: exiting ? 0 : 1,
          transition: dragging
            ? 'none'
            : 'transform 0.42s var(--ease-out-soft), opacity 0.32s linear',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Depth without a shadow stack: the next card, barely there, and rising into place as the one
// in front is pulled away. It arrives rather than appearing, so the deck reads as one object
// being dealt from and never as two cards swapping. Same rule as the card in front on the
// transition: none while the finger is down, so it tracks rather than lags.
function Behind({
  reached,
  dragging,
  children,
}: {
  reached: number
  dragging: boolean
  children: ReactNode
}) {
  return (
    <div
      aria-hidden
      // Beside the hiding rather than instead of it: `aria-hidden` promises the card behind is
      // not there, and only `inert` keeps the tab order from walking into it and proving
      // otherwise. The card draws a sheet that scrolls, and a sheet that scrolls owns a tab
      // stop wherever it is rendered.
      inert
      className="absolute inset-0 origin-bottom"
      style={{
        transform: `scale(${0.965 + 0.035 * reached}) translateY(${10 * (1 - reached)}px)`,
        opacity: 0.4 + 0.6 * reached,
        transition: dragging
          ? 'none'
          : 'transform 0.42s var(--ease-out-soft), opacity 0.42s var(--ease-out-soft)',
      }}
    >
      {children}
    </div>
  )
}

// The two verdicts sit behind the card and surface as it is pulled toward one, so the reader
// reads what they are about to say before they commit to saying it.
function Intent({
  left,
  right,
  pull,
  reached,
}: {
  left: string
  right: string
  pull: number
  reached: number
}) {
  // Readable well before it commits, so the reader can still change their mind.
  const toward = pull > INTENT ? 'right' : pull < -INTENT ? 'left' : null

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1">
      <span
        className="eyebrow text-[var(--color-ink-muted)] transition-opacity duration-200"
        style={{ opacity: toward === 'left' ? reached : 0 }}
      >
        {left}
      </span>
      <span
        className="eyebrow text-[var(--color-brand)] transition-opacity duration-200"
        style={{ opacity: toward === 'right' ? reached : 0 }}
      >
        {right}
      </span>
    </div>
  )
}
