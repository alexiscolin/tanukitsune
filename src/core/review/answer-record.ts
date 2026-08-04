import type { AnswerKind } from '../answer-kind'
import type { Verdict } from '../grading/judge-port'
import type { Locale } from '../locales'

// One answer, as the review screen knows it: which question was asked, what was typed, what the
// cascade made of it, and what the reader said instead. Those four and nothing more, since a
// screen that resolved a locale or allocated an identifier would be doing the writer's job.
export type AnsweredCard = {
  readonly subjectId: number
  readonly kind: AnswerKind
  // Null when the reader gave up rather than answered: nothing was typed and no tier was asked,
  // which is not the same row as an answer that was written and found wrong.
  readonly answer: string | null
  // What the cascade produced, null where no tier could place the answer and the reader ruled.
  readonly verdict: Verdict | null
  // Which tier decided, carrying its own version. It is what makes the v0.2 measurement of the
  // grader possible: a verdict with nobody behind it labels nothing.
  readonly decidedBy: string | null
  readonly said: Verdict
  // Read from the cached assignment, which is on the device before the question is asked.
  readonly srsStageBefore: number | null
}

// What the writer adds, which is everything the screen has no business knowing: what identifies
// the row, which reference it was graded against, and when it was answered.
export type AnswerStamp = {
  // Client-generated, because the row is written offline where nothing can allocate one, and
  // because it is what makes replaying a sync safe.
  readonly id: string
  readonly locale: Locale
  // Null while the deck is the seeded one, which carries no corpus and no version of one.
  readonly corpusVersion: string | null
  // The device clock, the only one available offline. The server stamps its own receipt time
  // beside it, so an implausible interval is detectable rather than fed to FSRS as fact.
  readonly answeredAt: Date
}

// The row, in the order docs/specs/v0.1.md names it on `review_event`. Append-only and never
// deleted: WaniKani discards review history, so this is the only record that will ever exist.
export type AnswerRecord = {
  readonly id: string
  readonly subjectId: number
  // Which reference the answer was graded against. The table is append-only, so a verdict whose
  // reference cannot be identified is a labelled case that can never be replayed.
  readonly locale: Locale
  readonly corpusVersion: string | null
  readonly answeredAt: Date
  readonly kind: AnswerKind
  // As it was submitted, before the normalisation each tier applies for its own comparison. A
  // normalised answer freezes the rule that produced it, and on an append-only table that means
  // the case can no longer be re-graded the day that rule changes.
  readonly answer: string | null
  readonly verdict: Verdict | null
  readonly decidedBy: string | null
  // What counts, which is the reader's ruling and not the cascade's.
  readonly correct: boolean
  // What the reader said instead, null where they said nothing else. That pair is the labelled
  // disagreement every later eval rests on, and it cannot be reconstructed after the fact.
  readonly overriddenTo: Verdict | null

  // Three fields saying how the answer was produced rather than what it was, present from the
  // first row because none of them can be filled once a row exists without them. Typed as the
  // empty value while no writer exists: the vocabulary each takes is chosen by the feature that
  // writes it, and inventing one here would freeze a spelling that feature has not picked.
  // `overrideReason` separates a mistyped answer from a grader that was wrong, `assist` records
  // what stood between the question and the answer, and `scheduled` says whether the answer
  // belongs to the review that was due or to practice the reader asked for.
  readonly overrideReason: null
  readonly assist: null
  readonly scheduled: null

  readonly srsStageBefore: number | null
  // The three the flush fills, and the only fields writable after the append. The stage comes
  // back in the source's response and is never computed locally, so it cannot exist before then.
  readonly srsStageAfter: number | null
  readonly appliedUpstream: boolean | null
  readonly syncedAt: Date | null
}

export function answerRecord(card: AnsweredCard, stamp: AnswerStamp): AnswerRecord {
  // A reader ruling where no tier could is not disagreeing with one, so that row carries what
  // they said in `correct` and overrides nothing. Reading it as an override would put a
  // disagreement nobody had into the calibration set.
  const overrode = card.verdict !== null && card.said !== card.verdict

  return {
    id: stamp.id,
    subjectId: card.subjectId,
    locale: stamp.locale,
    corpusVersion: stamp.corpusVersion,
    answeredAt: stamp.answeredAt,
    kind: card.kind,
    answer: card.answer,
    verdict: card.verdict,
    decidedBy: card.decidedBy,
    correct: card.said === 'correct',
    overriddenTo: overrode ? card.said : null,
    overrideReason: null,
    assist: null,
    scheduled: null,
    srsStageBefore: card.srsStageBefore,
    srsStageAfter: null,
    appliedUpstream: null,
    syncedAt: null,
  }
}
