'use client'

import { useState } from 'react'

import { stripItemFor } from '@/ui/molecules/deck-strip'
import { SessionDone } from '@/ui/molecules/session-done'
import { SessionScreen } from '@/ui/molecules/session-screen'
import { SubjectCard } from '@/ui/molecules/subject-card'
import { SwipeDeck } from '@/ui/molecules/swipe-deck'

import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'
import type { Subject } from '@/core/subject'

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
  const [index, setIndex] = useState(0)

  const subject = deck[index]
  const upcoming = deck[index + 1]

  if (subject === undefined) return <SessionDone label={copy.done} reached={index > 0} />

  return (
    // A lesson misses nothing: the rule says how much of the batch is behind and no more.
    <SessionScreen
      queue={deck.map((entry) => stripItemFor(entry, `${entry.id}`))}
      index={index}
      done={index}
      missed={0}
    >
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
    </SessionScreen>
  )
}
