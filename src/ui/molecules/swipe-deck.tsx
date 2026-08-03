'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { DeckBehind } from '@/ui/atoms/deck-behind'
import { SwipeIntent } from '@/ui/atoms/swipe-intent'
import { THRESHOLD, useDrag } from '@/ui/primitives/use-drag'
import type { SwipeDirection } from '@/ui/primitives/use-drag'

// The review gesture of the reference, and the whole grading control: no buttons and no
// grading bar. The card is judged by being dragged sideways, it tilts and dims as it goes,
// and the verdict it is heading for surfaces behind it.
//
// It grades to the same two outcomes the cascade already produces, so nothing about the
// verdict this reports is new: right is the answer the reader says was right, left is the one
// they say was wrong. A lesson pages through the same deck and judges nothing, which is why
// the two labels are optional.

// The tilt, in degrees per pixel of pull, expressed as its divisor.
const TILT = 26

export function SwipeDeck({
  cardKey,
  onDecide,
  leftLabel,
  rightLabel,
  label,
  describedBy,
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
  // What says, where a reader cannot see the card, why the deck has become gradable. Named on
  // the group rather than announced separately, since an announcement racing a focus move is
  // the one a screen reader drops.
  describedBy?: string
  disabled?: boolean
  behind?: ReactNode
  children: ReactNode
}) {
  const { drag, exiting, dragging, down, move, up, arrows } = useDrag(onDecide, disabled)
  const reached = Math.min(Math.abs(drag.x) / THRESHOLD, 1)
  const group = useRef<HTMLDivElement>(null)

  // The deck is the control that continues, so it takes the focus the moment it will answer
  // to one. A reader who cannot see the card has no other way to find it, and the card it
  // grades is the one they have just been told about.
  useEffect(() => {
    if (disabled !== true) group.current?.focus()
  }, [disabled, cardKey])

  // Positioned rather than sized: the caller's box takes its height from flex, which is a
  // used height and not a declared one, so a percentage height here resolves against nothing
  // and the deck collapses to zero.
  return (
    <div className="absolute inset-0">
      {leftLabel === undefined || rightLabel === undefined ? null : (
        <SwipeIntent left={leftLabel} right={rightLabel} pull={drag.x} reached={reached} />
      )}

      {behind === undefined ? null : (
        <DeckBehind key={`behind-${cardKey}`} reached={reached} dragging={dragging}>
          {behind}
        </DeckBehind>
      )}

      <div
        key={`front-${cardKey}`}
        ref={group}
        role="group"
        tabIndex={0}
        aria-label={label}
        aria-describedby={describedBy}
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
