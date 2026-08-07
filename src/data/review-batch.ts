import { z } from 'zod'

import { ANSWER_KINDS } from '@/core/answer-kind'
import { VERDICTS } from '@/core/grading/judge-port'
import { LOCALES } from '@/core/locales'
import { ruledConsistently } from '@/core/review/answer-record'
import type { AnswerRecord } from '@/core/review/answer-record'
import { BATCH_LIMIT } from '@/core/routes'

// The wire shape of what a browser queued, parsed at the boundary the way wanikani/payload.ts
// parses theirs: an untrusted body becomes a core type here or it becomes nothing.

// A date leaves the device as text, JSON carrying no other spelling of one, and lands in a column
// that is a timestamp. Coerced rather than accepted as text, so a row that cannot name an instant
// is refused here instead of by the driver.
const instant = z.iso.datetime({ offset: true }).transform((text) => new Date(text))

// Six fields no sender may state, for the two reasons answer-record.ts gives beside them. Refused
// rather than dropped, a field ignored being the same lie with nothing said about it.
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
  // Through the rule the constructor holds rather than a second reading of it here: the triple it
  // covers is the labelled disagreement every later eval rests on, and this table is never
  // corrected, so two spellings of one rule would differ on the row that matters.
  .refine(ruledConsistently)

// Counted before a row is read, zod checking an array's length only after parsing its elements: a
// caller sending five thousand rows would otherwise be refused at the cost of parsing five
// thousand rows. Non-empty besides, a request with nothing to store being a caller mistake rather
// than a batch that happens to be short.
const batch = z.array(z.unknown()).min(1).max(BATCH_LIMIT).pipe(z.array(row))

// Null rather than a thrown error, the caller being a route that answers a status either way and
// has nothing to add to a message this could write.
export function parseBatch(input: unknown): readonly AnswerRecord[] | null {
  const parsed = batch.safeParse(input)

  return parsed.success ? parsed.data : null
}
