'use client'

import { useId, useState } from 'react'

import { SessionTally } from '@/ui/atoms/session-tally'
import { stripItemFor } from '@/ui/molecules/deck-strip'
import { QuestionCard } from '@/ui/molecules/question-card'
import { SessionDone } from '@/ui/molecules/session-done'
import { SessionScreen } from '@/ui/molecules/session-screen'
import { SubjectCard } from '@/ui/molecules/subject-card'
import { SwipeDeck } from '@/ui/molecules/swipe-deck'
import type { SwipeDirection } from '@/ui/primitives/use-drag'

import { runCascade } from '@/core/grading/cascade'
import { questionKey } from '@/core/demo-deck'
import type { Question } from '@/core/demo-deck'
import type { Verdict } from '@/core/grading/judge-port'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'

// The review screen. The character is on the slab, the answer is written on a rule under it,
// and the card is the control that grades and moves on.
//
// It takes the questions rather than building them: which subject is asked, for what, and in
// what order is what an assignment says, and this screen is not where that is decided.

// The two are kept apart rather than one overwriting the other: what the cascade produced and
// what the reader said instead are the labelled disagreement a review event carries, on exactly
// the hard middle where a grader is worth correcting. `said` is what the tally counts and what
// the deck advances on; `decided` is the half that no later reading can recover, and it waits
// here for the assignment layer that will write it.
type Reviewed = {
  readonly decided: Verdict | null
  readonly said: Verdict
}

// What the strike and the colour say to a reader who can see them. Nothing until something has
// been said about the card, then the verdict a tier reached, or the question put back to the
// reader when none could.
function spoken(answered: boolean, decided: Verdict | null, copy: ReviewCopy): string {
  return !answered ? '' : decided === null ? copy.askSelfGrade : copy.verdict[decided]
}

export function ReviewSession({
  questions,
  copy,
  subjectCopy,
}: {
  questions: readonly Question[]
  copy: ReviewCopy
  subjectCopy: SubjectCopy
}) {
  const [index, setIndex] = useState(0)
  const [decided, setDecided] = useState<Verdict | null>(null)
  const [answered, setAnswered] = useState(false)
  const [reviewed, setReviewed] = useState<readonly Reviewed[]>([])
  const verdictId = useId()

  const question = questions[index]
  const upcoming = questions[index + 1]

  // Counted from what the reader said rather than from the index, because a card they got
  // wrong and one they got right are the same step through the deck. Both numbers are read off
  // the same list, so the rule at the foot and the tally on the card cannot disagree.
  const missed = reviewed.filter((entry) => entry.said === 'incorrect').length
  const right = reviewed.filter((entry) => entry.said === 'correct').length

  const submit = async (asked: Question, raw: string) => {
    const outcome = await runCascade(
      { kind: asked.kind, answer: raw, accepted: asked.accepted },
      null,
    )

    setDecided(outcome.verdict === 'undecided' ? null : outcome.verdict)
    setAnswered(true)
  }

  // Pressing the dot is giving up rather than answering, so it opens the card and leaves the
  // verdict to the reader: nothing was typed, and there is nothing for a tier to decide.
  function giveUp() {
    setDecided(null)
    setAnswered(true)
  }

  // One gesture grades and moves on, which is what removes the grading bar: right is the
  // reader saying the answer was right, left that it was wrong. Both halves are kept, since
  // what the cascade produced cannot be rebuilt from the correction alone.
  function decide(direction: SwipeDirection) {
    setReviewed([...reviewed, { decided, said: direction === 'right' ? 'correct' : 'incorrect' }])
    setAnswered(false)
    setDecided(null)
    setIndex(index + 1)
  }

  if (question === undefined) return <SessionDone label={copy.done} reached={index > 0} />

  return (
    <SessionScreen
      queue={questions.map((asked) => stripItemFor(asked.subject, questionKey(asked)))}
      index={index}
      done={right}
      missed={missed}
      announce={
        // Mounted whether or not it holds anything, because a polite region has to be in the
        // document before its content changes: one inserted with its text already in it is the
        // case a screen reader routinely says nothing about.
        <p role="status" id={verdictId} className="sr-only">
          {spoken(answered, decided, copy)}
        </p>
      }
    >
      <SwipeDeck
        cardKey={questionKey(question)}
        onDecide={decide}
        leftLabel={copy.grade.incorrect}
        rightLabel={copy.grade.correct}
        label={copy.askSelfGrade}
        describedBy={verdictId}
        disabled={!answered}
        behind={
          upcoming === undefined ? undefined : (
            <SubjectCard
              subject={upcoming.subject}
              copy={subjectCopy}
              flow="review"
              revealed={false}
            />
          )
        }
      >
        <QuestionCard
          question={question}
          copy={copy}
          subjectCopy={subjectCopy}
          answered={answered}
          decided={decided}
          foot={
            answered ? (
              <SessionTally
                done={right}
                left={questions.length - index}
                missed={missed}
                copy={copy.tally}
              />
            ) : undefined
          }
          onReveal={giveUp}
          onSubmit={(raw) => {
            void submit(question, raw)
          }}
          onEdit={() => setAnswered(false)}
        />
      </SwipeDeck>
    </SessionScreen>
  )
}
