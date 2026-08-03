'use client'

import { ScreenShell } from '@/ui/atoms/screen-shell'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { runCascade } from '@/core/grading/cascade'
import type { Question } from '@/core/demo-deck'
import type { Verdict } from '@/core/grading/judge-port'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'

import {
  DeckStrip,
  MenuMark,
  SessionRule,
  SessionTally,
  StepCount,
} from '@/ui/atoms/session-chrome'
import type { StripItem } from '@/ui/atoms/session-chrome'
import { AnswerField } from '@/ui/molecules/answer-field'
import { SubjectCard } from '@/ui/molecules/subject-card'
import { SwipeDeck } from '@/ui/primitives/swipe-deck'
import type { SwipeDirection } from '@/ui/primitives/swipe-deck'

// The review screen. The character is on the slab, the answer is written on a rule under it,
// and the card is the control that grades and moves on.
//
// It takes the questions rather than building them: which subject is asked, for what, and in
// what order is what an assignment says, and this screen is not where that is decided.

// The mark and the counter on one row, the deck on a band of its own under them. The deck is
// read across rather than glanced at, which is what a row squeezed between two fixed things
// cannot be.
function SessionHeader({
  questions,
  index,
}: {
  questions: readonly Question[]
  index: number
}) {
  const strip: readonly StripItem[] = questions.map(({ subject, kind }) => ({
    key: `${subject.id}-${kind}`,
    characters: subject.characters ?? '',
    type: subject.type,
  }))

  return (
    <>
      <header className="pt-safe flex items-start justify-between gap-4">
        <MenuMark />
        <StepCount step={index + 1} total={questions.length} />
      </header>
      <DeckStrip queue={strip} index={index} />
    </>
  )
}

// The card as a question: the field under the character until something has been said about
// it, and gone once it was right, because there is then nothing left to compare it against
// and the answer standing alone under the character is the whole point of the card opening.
function Asked({
  question,
  copy,
  subjectCopy,
  answered,
  decided,
  foot,
  onReveal,
  onSubmit,
  onEdit,
}: {
  question: Question
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  answered: boolean
  decided: Verdict | null
  foot?: ReactNode
  onReveal: () => void
  onSubmit: (raw: string) => void
  onEdit: () => void
}) {
  return (
    <SubjectCard
      subject={question.subject}
      copy={subjectCopy}
      flow="review"
      revealed={answered}
      asked={question.kind}
      onReveal={onReveal}
      foot={foot}
      answer={
        answered && decided === 'correct' ? null : (
          <AnswerField
            key={`${question.subject.id}-${question.kind}`}
            kind={question.kind}
            label={copy.prompt[question.kind]}
            unconverted={copy.unconverted}
            // Every card, the first included. The field is remounted per question, so this
            // fires on each one and the keyboard never has to be summoned.
            autoFocus
            judged={answered}
            onSubmit={onSubmit}
            onEdit={onEdit}
          />
        )
      }
    />
  )
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
  // Counted rather than derived from the index, because a question the reader got wrong and
  // one they got right are the same step through the queue.
  const [missed, setMissed] = useState(0)

  const question = questions[index]
  const upcoming = questions[index + 1]

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
  // reader saying the answer was right, left that it was wrong.
  function decide(direction: SwipeDirection) {
    if (direction === 'left') setMissed(missed + 1)
    setAnswered(false)
    setDecided(null)
    setIndex(index + 1)
  }

  if (question === undefined) {
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
      <SessionHeader questions={questions} index={index} />

      <div className="pb-safe relative flex min-h-0 flex-1 flex-col pt-3">
        <div className="relative min-h-0 flex-1">
          <SwipeDeck
            cardKey={`${question.subject.id}-${question.kind}`}
            onDecide={decide}
            leftLabel={copy.grade.incorrect}
            rightLabel={copy.grade.correct}
            label={copy.askSelfGrade}
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
            <Asked
              question={question}
              copy={copy}
              subjectCopy={subjectCopy}
              answered={answered}
              decided={decided}
              foot={
                answered ? (
                  <SessionTally
                    done={index - missed}
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
        </div>
      </div>

      {/* Flush with the bottom of the screen and the last thing on it: three quantities on
          one bar, what is passed, what was missed and what is left. The width is the quantity
          and the colour says which, so there is no label and no digit. */}
      <SessionRule done={index - missed} missed={missed} total={questions.length} />
    </ScreenShell>
  )
}
