import { z } from 'zod'

import { ANSWER_KINDS } from '@/core/answer-kind'
import { VERDICTS } from '@/core/grading/judge-port'
import { LOCALES } from '@/core/locales'
import type { AnswerRecord } from '@/core/review/answer-record'

// The wire shape of what a browser queued, parsed at the boundary the way wanikani/payload.ts
// parses theirs: an untrusted body becomes a core type here or it becomes nothing.

// A date leaves the device as text, JSON carrying no other spelling of one, and lands in a column
// that is a timestamp. Coerced rather than accepted as text, so a row that cannot name an instant
// is refused here instead of by the driver.
const instant = z.iso.datetime({ offset: true }).transform((text) => new Date(text))

// Null on the wire, for two different reasons that happen to have one spelling. The three the
// flush fills, `srsStageAfter`, `appliedUpstream` and `syncedAt`, are the server's to decide: a
// browser claiming a stage the source never returned would put a number nobody received into the
// only record that will ever exist. The three that carry how an answer was produced,
// `overrideReason`, `assist` and `scheduled`, are null because no feature writes them yet, and the
// vocabulary each takes is chosen by the feature that does. A field silently dropped would be the
// same lie with nothing said about it, so both are refused rather than ignored.
const unwritten = z.null()

const row = z.object({
  id: z.uuid(),
  subjectId: z.number().int().positive(),
  // The three unions read from the lists that define them rather than as free text. The column is
  // text and the table is append-only, so a value nobody defined is a row no later reader can
  // interpret and none of them can be corrected.
  locale: z.enum(LOCALES),
  corpusVersion: z.string().min(1).nullable(),
  answeredAt: instant,
  kind: z.enum(ANSWER_KINDS),
  answer: z.string().nullable(),
  verdict: z.enum(VERDICTS).nullable(),
  decidedBy: z.string().min(1).nullable(),
  correct: z.boolean(),
  overriddenTo: z.enum(VERDICTS).nullable(),
  overrideReason: unwritten,
  assist: unwritten,
  scheduled: unwritten,
  srsStageBefore: z.number().int().nonnegative().nullable(),
  srsStageAfter: unwritten,
  appliedUpstream: unwritten,
  syncedAt: unwritten,
})
  // What the reader ruled and what a tier concluded are one triple in the constructor, so a row
  // where they disagree is one no session could have produced. It is also the triple every later
  // eval rests on, per answer-record.ts, and the table is append-only, so a contradiction accepted
  // here is a labelled case that will never be right.
  .refine(
    (entry) =>
      entry.overriddenTo === null ||
      (entry.verdict !== null && entry.overriddenTo !== entry.verdict),
    'An override names a verdict a tier reached and disagreed with.',
  )
  .refine(
    (entry) => entry.overriddenTo === null || entry.correct === (entry.overriddenTo === 'correct'),
    'What counts is what the reader said, so an override and `correct` cannot disagree.',
  )

// What one request may carry. Postgres binds one parameter per column per row and refuses a
// statement past 65535 of them, so an unbounded batch of eighteen-column rows fails in the driver
// somewhere past three thousand: a queue that grew that large offline would answer 500 and be
// resent forever, which is the one failure a drain cannot recover from. Refused here instead, in a
// number the sender pages against.
export const BATCH_LIMIT = 500

// Non-empty, a request with nothing to store being a caller mistake rather than a batch that
// happens to be short.
const batch = z.array(row).min(1).max(BATCH_LIMIT)

// Null rather than a thrown error, the caller being a route that answers a status either way and
// has nothing to add to a message this could write.
export function parseBatch(input: unknown): readonly AnswerRecord[] | null {
  const parsed = batch.safeParse(input)

  return parsed.success ? parsed.data : null
}
