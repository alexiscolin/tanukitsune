'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { runCascade } from '@/core/grading/cascade'
import type { Verdict } from '@/core/grading/judge-port'
import type { ReviewEntry } from '@/core/review-entry'
import type { ReviewCopy } from '@/core/site-copy'

import { AnswerInput } from './answer-input'

// The two are kept apart rather than one overwriting the other: what the cascade produced
// and what the reader said instead are the labelled disagreement a review event carries,
// and it cannot be reconstructed from the corrected value alone.
type Answered = {
  readonly decided: Verdict | null
  readonly overridden: Verdict | null
}

// The one place the override wins, so the message and the buttons cannot come to disagree
// about the same answer. Null while no tier decided and the reader has not either.
function verdictOf({ decided, overridden }: Answered): Verdict | null {
  return overridden ?? decided
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
  const end = useRef<HTMLHeadingElement>(null)
  const verdictId = useId()

  const entry = queue[index]

  // The button that ended the session left with the focus on it, so the end takes it like
  // every other step of the loop does rather than dropping it on the document. Only once
  // a step has been left: a queue that arrives empty was never a session, and taking the
  // focus as the page loads is what the field's own rule refuses.
  useEffect(() => {
    if (index > 0) end.current?.focus()
  }, [entry, index])

  // No tally, because v0.1 refuses statistics and a number nothing persists is one the
  // reader cannot check. What was answered is in the log, once there is a log.
  if (entry === undefined) {
    return (
      <h1 ref={end} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">
        {copy.done}
      </h1>
    )
  }

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
          is the case a screen reader routinely says nothing about. It is also named as the
          description of whatever takes the focus next, since an announcement racing a focus
          move is the one a screen reader drops. */}
      <p role="status" id={verdictId} className="text-lg">
        {answered === null ? '' : verdictMessage(verdictOf(answered), copy)}
      </p>

      {answered === null ? (
        <AnswerInput
          kind={entry.kind}
          label={copy.answerLabel}
          unconverted={copy.unconverted}
          // Every field but the first one replaced a verdict the reader has just left.
          autoFocus={index > 0}
          onSubmit={(raw) => {
            void submit(raw)
          }}
        />
      ) : (
        <VerdictPanel
          entry={entry}
          answered={answered}
          copy={copy}
          verdictId={verdictId}
          onGrade={grade}
          onAdvance={advance}
        />
      )}
    </section>
  )
}

// `Object.keys` widens to string, and the cast narrows it back to what the record's own
// type already guarantees: one key per verdict, which is the exhaustiveness this reads for.
function gradesIn(copy: ReviewCopy): Verdict[] {
  return Object.keys(copy.grade) as Verdict[]
}

function verdictMessage(verdict: Verdict | null, copy: ReviewCopy): string {
  return verdict === null ? copy.askSelfGrade : copy.verdict[verdict]
}

function VerdictPanel({
  entry,
  answered,
  copy,
  verdictId,
  onGrade,
  onAdvance,
}: {
  entry: ReviewEntry
  answered: Answered
  copy: ReviewCopy
  verdictId: string
  onGrade: (said: Verdict) => void
  onAdvance: () => void
}) {
  const verdict = verdictOf(answered)
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
    <div
      ref={panel}
      tabIndex={-1}
      aria-describedby={verdictId}
      className="flex flex-col gap-4 outline-none"
    >
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

      {/* Every verdict the standing one is not: undecided offers both, and a decided
          verdict offers the other one, which is the override. Read off the copy rather than
          listed here, because the copy owes one label per verdict by type and a list written
          beside it would answer a wider union with silence. */}
      <div className="flex flex-wrap gap-2">
        {gradesIn(copy)
          .filter((said) => said !== verdict)
          .map((said) => (
            <button key={said} type="button" onClick={() => onGrade(said)} className={BUTTON}>
              {copy.grade[said]}
            </button>
          ))}
        {/* An answer no tier decided has no button here at all: it is graded first. */}
        {verdict === null ? null : (
          <button
            ref={next}
            type="button"
            onClick={onAdvance}
            aria-describedby={verdictId}
            className={BUTTON}
          >
            {copy.next}
          </button>
        )}
      </div>
    </div>
  )
}
