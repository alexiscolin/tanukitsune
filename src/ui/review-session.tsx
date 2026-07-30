'use client'

import { useEffect, useRef, useState } from 'react'

import { runCascade } from '@/core/grading/cascade'
import type { ReviewEntry } from '@/core/review-entry'
import type { ReviewCopy } from '@/core/site-copy'

import { AnswerInput } from './answer-input'

type Verdict = 'correct' | 'incorrect'

// The two are kept apart rather than one overwriting the other: what the cascade produced
// and what the reader said instead are the labelled disagreement a review event carries,
// and it cannot be reconstructed from the corrected value alone.
type Answered = {
  readonly decided: Verdict | null
  readonly overridden: Verdict | null
}

const BUTTON =
  'rounded-md border border-[var(--color-ink-muted)] px-3 py-2 text-sm text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]'

const MUTED = 'text-sm text-[var(--color-ink-muted)]'

export function ReviewSession({
  queue,
  copy,
}: {
  queue: readonly ReviewEntry[]
  copy: ReviewCopy
}) {
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<Answered | null>(null)

  const entry = queue[index]

  // No tally, because v0.1 refuses statistics and a number nothing persists is one the
  // reader cannot check. What was answered is in the log, once there is a log.
  if (entry === undefined) {
    return <h1 className="text-3xl font-semibold tracking-tight">{copy.done}</h1>
  }

  // What the reader is left with once nothing overrode anything, and null while no tier
  // decided: the session owns no verdict then, so there is nothing to move on from.
  const verdict = answered === null ? null : (answered.overridden ?? answered.decided)

  // An expression rather than a declaration, which is hoisted and would therefore be read
  // as able to run before the entry above it was found.
  const submit = async (raw: string) => {
    // No port, because v0.1 ships no model tier. A meaning the exact tier cannot match is
    // therefore undecided by design, and the reader is what resolves it.
    const outcome = await runCascade(
      { kind: entry.kind, answer: raw, accepted: entry.accepted },
      null,
    )

    setAnswered({
      decided: outcome.verdict === 'undecided' ? null : outcome.verdict,
      overridden: null,
    })
  }

  // A reader who grades their way back to what the cascade already said did not override
  // it, so nothing is held against it: the pair exists to carry a disagreement, and one
  // recorded where none happened is a labelled case that says the opposite of the truth.
  function grade(said: Verdict) {
    setAnswered((current) =>
      current === null
        ? current
        : { ...current, overridden: said === current.decided ? null : said },
    )
  }

  function advance() {
    setAnswered(null)
    setIndex(index + 1)
  }

  return (
    <section className="flex flex-col gap-6">
      <p className={MUTED}>
        {copy.progress} {index + 1} / {queue.length}
      </p>

      <div className="flex flex-col gap-1">
        <h1 lang="ja" className="text-6xl leading-none">
          {entry.characters}
        </h1>
        <p className={MUTED}>{copy.prompt[entry.kind]}</p>
      </div>

      {/* Rendered whether or not it holds anything, because a polite region has to be in
          the document before its content changes: one inserted with its text already in it
          is the case a screen reader routinely says nothing about. */}
      <p role="status" className="text-lg">
        {answered === null ? '' : verdictMessage(verdict, copy)}
      </p>

      {answered === null ? (
        <AnswerInput
          kind={entry.kind}
          label={copy.answerLabel}
          unconverted={copy.unconverted}
          onSubmit={(raw) => {
            void submit(raw)
          }}
        />
      ) : (
        <VerdictPanel
          entry={entry}
          answered={answered}
          copy={copy}
          onGrade={grade}
          onAdvance={advance}
        />
      )}
    </section>
  )
}

function verdictMessage(verdict: Verdict | null, copy: ReviewCopy): string {
  if (verdict === null) return copy.askSelfGrade

  return verdict === 'correct' ? copy.correct : copy.incorrect
}

function VerdictPanel({
  entry,
  answered,
  copy,
  onGrade,
  onAdvance,
}: {
  entry: ReviewEntry
  answered: Answered
  copy: ReviewCopy
  onGrade: (said: Verdict) => void
  onAdvance: () => void
}) {
  const verdict = answered.overridden ?? answered.decided
  const panel = useRef<HTMLDivElement>(null)
  const next = useRef<HTMLButtonElement>(null)

  // The field that held the focus is gone, so the focus is placed rather than left to fall
  // to the document, where the next keystroke reaches nothing and a reader who does not use
  // a mouse has to walk the page again. On the button that continues the loop once a verdict
  // stands, and on the panel itself while the reader is the one who has to decide.
  useEffect(() => {
    ;(next.current ?? panel.current)?.focus()
  }, [verdict])

  return (
    <div ref={panel} tabIndex={-1} className="flex flex-col gap-4 outline-none">
      {/* Kept while the reader can still act on it, so grading does not remove what was
          graded against. Hidden only while the cascade's correct verdict stands unchallenged.
          The full item card is what the corpus adds here. */}
      {answered.decided === 'correct' && answered.overridden === null ? null : (
        <div className="flex flex-col gap-1">
          <p className={MUTED}>{copy.expected}</p>
          <p lang={entry.kind === 'reading' ? 'ja' : undefined} className="text-xl">
            {entry.accepted.join(', ')}
          </p>
        </div>
      )}

      {/* One pair of labels for the three states: undecided offers both, and a decided
          verdict offers the other one, which is the override. */}
      <div className="flex flex-wrap gap-2">
        {verdict === 'correct' ? null : (
          <button type="button" onClick={() => onGrade('correct')} className={BUTTON}>
            {copy.gradeCorrect}
          </button>
        )}
        {verdict === 'incorrect' ? null : (
          <button type="button" onClick={() => onGrade('incorrect')} className={BUTTON}>
            {copy.gradeIncorrect}
          </button>
        )}
        {/* An answer no tier decided has no button here at all: it is graded first. */}
        {verdict === null ? null : (
          <button ref={next} type="button" onClick={onAdvance} className={BUTTON}>
            {copy.next}
          </button>
        )}
      </div>
    </div>
  )
}
