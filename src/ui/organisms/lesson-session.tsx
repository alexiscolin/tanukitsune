'use client'

import { ScreenShell } from '@/ui/atoms/screen-shell'
import { useState } from 'react'

import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'

import { DeckStrip, MenuMark, SessionRule, StepCount } from '@/ui/atoms/session-chrome'
import type { StripItem } from '@/ui/atoms/session-chrome'
import { SubjectCard } from '@/ui/molecules/subject-card'
import type { Subject } from '@/core/subject'
import { SwipeDeck } from '@/ui/primitives/swipe-deck'

// The lesson flow, and the same deck as the review: a batch arrives, it is paged through,
// and nothing in it is judged. What separates the two screens is that this one has no field
// and no verdict, so every card is open from its first frame and the swipe only advances.
//
// Neither direction means anything different here, which is why the deck surfaces no verdict
// behind the card: there is nothing to be about to say.

export function LessonSession({
  deck,
  copy,
  subjectCopy,
}: {
  deck: readonly Subject[]
  copy: ReviewCopy
  subjectCopy: SubjectCopy
}) {
  const strip: readonly StripItem[] = deck.map((subject) => ({
    key: `${subject.id}`,
    characters: subject.characters ?? '',
    type: subject.type,
  }))

  const [index, setIndex] = useState(0)

  const subject = deck[index]
  const upcoming = deck[index + 1]

  if (subject === undefined) {
    return (
      <ScreenShell>
        <h1 className="animate-drift flex flex-1 items-center text-4xl leading-tight font-medium tracking-tight">
          {copy.done}
        </h1>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <header className="pt-safe flex items-start justify-between gap-4">
        <MenuMark />
        <StepCount step={index + 1} total={deck.length} />
      </header>

      <DeckStrip queue={strip} index={index} />

      <div className="pb-safe relative flex min-h-0 flex-1 flex-col pt-3">
        <div className="relative min-h-0 flex-1">
          <SwipeDeck
            cardKey={`${subject.id}`}
            label={copy.next}
            onDecide={() => setIndex(index + 1)}
            behind={
              upcoming === undefined ? undefined : (
                <SubjectCard subject={upcoming} copy={subjectCopy} flow="lesson" revealed />
              )
            }
          >
            <SubjectCard subject={subject} copy={subjectCopy} flow="lesson" revealed />
          </SwipeDeck>
        </div>
      </div>

      {/* A lesson misses nothing: the bar says how much of the batch is behind and no more. */}
      <SessionRule done={index} missed={0} total={deck.length} />
    </ScreenShell>
  )
}

