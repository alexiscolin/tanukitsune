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

// The three the flush fills are refused rather than ignored. A browser claiming a stage the source
// never returned would put a number nobody received into the only record that will ever exist, and
// a field silently dropped is the same lie with nothing said about it.
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

// Non-empty, a request with nothing to store being a caller mistake rather than a batch that
// happens to be short.
const batch = z.array(row).min(1)

// Null rather than a thrown error, the caller being a route that answers a status either way and
// has nothing to add to a message this could write.
export function parseBatch(input: unknown): readonly AnswerRecord[] | null {
  const parsed = batch.safeParse(input)

  return parsed.success ? parsed.data : null
}
