'use client'

import { useId, useRef, useState } from 'react'

import { SessionTally } from '@/ui/atoms/session-tally'
import { stripItemFor } from '@/ui/molecules/deck-strip'
import { QuestionCard } from '@/ui/molecules/question-card'
import { SessionDone } from '@/ui/molecules/session-done'
import { SessionScreen } from '@/ui/molecules/session-screen'
import { SubjectCard } from '@/ui/molecules/subject-card'
import { SwipeDeck } from '@/ui/molecules/swipe-deck'
import type { SwipeDirection } from '@/ui/primitives/use-drag'

import { runCascade } from '@/core/grading/cascade'
import type { CascadeOutcome } from '@/core/grading/cascade'
import { questionKey } from '@/core/demo-deck'
import type { Question } from '@/core/demo-deck'
import type { Verdict } from '@/core/grading/judge-port'
import type { AnsweredCard } from '@/core/review/answer-record'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'

// The review screen. The character is on the slab, the answer is written on a rule under it,
// and the card is the control that grades and moves on.
//
// It takes the questions rather than building them: which subject is asked, for what, and in
// what order is what an assignment says, and this screen is not where that is decided. It takes
// the writer for the same reason: where the answer is kept is not a decision a screen makes.

// What the strike and the colour say to a reader who can see them. Nothing until something has
// been said about the card, then the verdict a tier reached, or the question put back to the
// reader when none could. A refusal displaces all three, since it is the only one that asks the
// reader to do something again.
function spoken(
  answered: boolean,
  decided: Verdict | null,
  unwritten: boolean,
  copy: ReviewCopy,
): string {
  if (unwritten) return copy.unwritten

  return !answered ? '' : decided === null ? copy.askSelfGrade : copy.verdict[decided]
}

// What has been said about the card in front: what was typed, and what the cascade made of it.
// One value rather than three fields that can disagree, and null until anything has been said,
// which is what the deck reads to know whether the card can be graded at all. Giving up is the
// value with nothing in it: something was said, and it was that nothing would be typed.
type Answer = {
  readonly typed: string | null
  readonly outcome: CascadeOutcome | null
}

// Undecided is not a verdict. It is the question handed back to the reader, so the card renders
// nothing where a tier would have written one, and the row records that nobody decided rather than
// naming a tier that did not. Both halves are read off one branch, or the day a tier returns a
// verdict without its tag the screen and the row would disagree about what happened.
function decisionOf(outcome: CascadeOutcome | null): Pick<AnsweredCard, 'verdict' | 'decidedBy'> {
  return outcome === null || outcome.verdict === 'undecided'
    ? { verdict: null, decidedBy: null }
    : { verdict: outcome.verdict, decidedBy: outcome.decidedBy }
}

// The card as the writer takes it. What the cascade produced and what the reader said are kept
// apart rather than one overwriting the other: that pair is the labelled disagreement a review
// event carries, on exactly the hard middle where a grader is worth correcting, and the tier
// tag says who reached the half the reader ruled against.
function answeredCard(asked: Question, answer: Answer | null, said: Verdict): AnsweredCard {
  return {
    subjectId: asked.subject.id,
    kind: asked.kind,
    answer: answer?.typed ?? null,
    ...decisionOf(answer?.outcome ?? null),
    said,
    srsStageBefore: asked.subject.srsStage,
  }
}

// The three numbers a session has, and the refusal beside them when the answer could not be
// kept. Beside rather than instead of: the card was not counted, and the count it was not added
// to is the other half of that sentence.
function cardFoot(tally: ReturnType<typeof tallyOf>, unwritten: boolean, copy: ReviewCopy) {
  return (
    <span className="flex items-center gap-4">
      <SessionTally {...tally} copy={copy.tally} />
      {unwritten ? (
        <span className="text-2xs text-[var(--color-destructive)]">{copy.unwritten}</span>
      ) : null}
    </span>
  )
}

// Counted from what the reader said rather than from the index, because a card they got wrong and
// one they got right are the same step through the deck. Every number the screen shows is read off
// this one list, so the rule at the foot and the tally on the card cannot disagree.
function tallyOf(ruled: readonly Verdict[], left: number) {
  return {
    done: ruled.filter((verdict) => verdict === 'correct').length,
    left,
    missed: ruled.filter((verdict) => verdict === 'incorrect').length,
  }
}

// The card under the one being graded, closed: the deck shows the next subject arriving, and there
// is nothing behind the last one.
function behind(upcoming: Question | undefined, copy: SubjectCopy) {
  if (upcoming === undefined) return undefined

  return <SubjectCard subject={upcoming.subject} copy={copy} flow="review" revealed={false} />
}

// Mounted whether or not it holds anything, because a polite region has to be in the document
// before its content changes: one inserted with its text already in it is the case a screen
// reader routinely says nothing about.
function announcement(id: string, said: string) {
  return (
    <p role="status" id={id} className="sr-only">
      {said}
    </p>
  )
}

export function ReviewSession({
  questions,
  copy,
  subjectCopy,
  exitTo,
  onAnswered,
}: {
  questions: readonly Question[]
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  exitTo: string
  // Awaited before the deck advances, and a rejection keeps the card: an answer that is not
  // durably written is not accepted, so a quota that refused it surfaces here rather than as an
  // answer the reader believes was counted.
  onAnswered: (card: AnsweredCard) => Promise<void>
}) {
  const [index, setIndex] = useState(0)
  // The whole outcome rather than the verdict alone: which tier decided is written down beside
  // it, and a screen keeping only the verdict would drop the half that labels the row.
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [unwritten, setUnwritten] = useState(false)
  const [ruled, setRuled] = useState<readonly Verdict[]>([])
  const writing = useRef(false)
  const verdictId = useId()

  const question = questions[index]
  const upcoming = questions[index + 1]
  const answered = answer !== null
  const { verdict: decided } = decisionOf(answer?.outcome ?? null)

  const tally = tallyOf(ruled, questions.length - index)

  // Every path that changes what has been said about the card goes through here, so a refusal
  // cannot outlive the answer it was about: the region would otherwise keep announcing it over
  // the verdict of the answer typed next.
  function say(next: Answer | null) {
    setAnswer(next)
    setUnwritten(false)
  }

  const submit = async (asked: Question, raw: string) => {
    const graded = { kind: asked.kind, answer: raw, accepted: asked.accepted }

    say({ typed: raw, outcome: await runCascade(graded, null) })
  }

  // Pressing the dot is giving up rather than answering, so it opens the card and leaves the
  // verdict to the reader: nothing was typed, and there is nothing for a tier to decide.
  function giveUp() {
    say({ typed: null, outcome: null })
  }

  // One gesture grades and moves on, which is what removes the grading bar: right is the
  // reader saying the answer was right, left that it was wrong.
  //
  // The deck waits on the write rather than racing it. A refusal leaves the card where it was,
  // still answered, so the same gesture writes the same answer rather than asking for it again.
  async function decide(asked: Question, direction: SwipeDirection) {
    // The deck stays gradable while the write is in flight, and the gesture that started it has
    // already reset itself. A second one landing before the first resolves would append the same
    // card twice and count it once, both of them reading the ruling this one has not recorded yet.
    if (writing.current) return
    writing.current = true

    const said: Verdict = direction === 'right' ? 'correct' : 'incorrect'

    try {
      await onAnswered(answeredCard(asked, answer, said))
    } catch {
      setUnwritten(true)

      return
    } finally {
      writing.current = false
    }

    setRuled([...ruled, said])
    say(null)
    setIndex(index + 1)
  }

  if (question === undefined) return <SessionDone copy={copy} reached={index > 0} exitTo={exitTo} />

  return (
    <SessionScreen
      queue={questions.map((asked) => stripItemFor(asked.subject, questionKey(asked)))}
      index={index}
      done={tally.done}
      missed={tally.missed}
      announce={announcement(verdictId, spoken(answered, decided, unwritten, copy))}
    >
      <SwipeDeck
        cardKey={questionKey(question)}
        onDecide={(direction) => {
          void decide(question, direction)
        }}
        leftLabel={copy.grade.incorrect}
        rightLabel={copy.grade.correct}
        label={copy.askSelfGrade}
        describedBy={verdictId}
        disabled={!answered}
        behind={behind(upcoming, subjectCopy)}
      >
        <QuestionCard
          question={question}
          copy={copy}
          subjectCopy={subjectCopy}
          answered={answered}
          decided={decided}
          foot={answered ? cardFoot(tally, unwritten, copy) : undefined}
          onReveal={giveUp}
          onSubmit={(raw) => {
            void submit(question, raw)
          }}
          onEdit={() => say(null)}
        />
      </SwipeDeck>
    </SessionScreen>
  )
}
