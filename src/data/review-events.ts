import 'server-only'

import type { AnswerRecord } from '@/core/review/answer-record'

import { and, inArray, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { ANSWER_KINDS } from '@/core/answer-kind'
import type { Answered } from '@/core/review/submission'

import { db } from './db'
import { reviewEvent } from './schema'

// The durable half of the review queue. WaniKani discards review history, so a row here is the
// only record of an answer that will ever exist, which is why the append happens inside the
// request rather than after the response, per docs/framing.md under mutation transport.

// How many rows the table gained, which is not how many the caller sent: every row a batch names
// is durable when this returns, and a replayed one appends none.
export async function appendAnswers(records: readonly AnswerRecord[]): Promise<number> {
  const rows = records.map((record) => ({
    ...record,
    // Text, because the column joins `corpus_entry` on the same identifier and their numbering is
    // one implementation of what a subject is called rather than the definition of it.
    subjectId: String(record.subjectId),
  }))

  // The identifier comes from the device, so a batch sent twice collides on the primary key. Doing
  // nothing on that collision is what makes a lost acknowledgement safe to answer with a resend,
  // and returning what was inserted is what tells the two cases apart afterwards.
  const appended = await (await db())
    .insert(reviewEvent)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: reviewEvent.id })

  return appended.length
}

// The rows the source has not been told about, oldest first because scheduling is order dependent.
// `applied_upstream` is null until a submission returns, which is what makes it the only mark
// worth reading: a row that reached the source carries true, and one it refused carries false.
export async function unsentAnswers(): Promise<readonly Answered[]> {
  const rows = await (await db())
    .select({
      id: reviewEvent.id,
      subjectId: reviewEvent.subjectId,
      kind: reviewEvent.kind,
      correct: reviewEvent.correct,
    })
    .from(reviewEvent)
    .where(isNull(reviewEvent.appliedUpstream))
    .orderBy(reviewEvent.answeredAt, reviewEvent.id)

  // Four columns rather than eighteen, and read through the same enum the writer wrote: the column
  // is text, so a kind nobody defined would otherwise be counted as neither meaning nor reading and
  // hold its subject back for ever with nothing said.
  return z
    .array(
      z.object({
        id: z.string(),
        subjectId: z.coerce.number().int(),
        kind: z.enum(ANSWER_KINDS),
        correct: z.boolean(),
      }),
    )
    .parse(rows)
}

// Whether any of these rows has already been told to the source. Read before a submission rather
// than after it: their created review carries no identifier worth reading back, so a submission
// sent twice cannot be told from one sent once and the second advances the item again.
export async function sentAlready(ids: readonly string[]): Promise<boolean> {
  const marked = await (await db())
    .select({ id: reviewEvent.id })
    .from(reviewEvent)
    .where(and(inArray(reviewEvent.id, [...ids]), isNotNull(reviewEvent.appliedUpstream)))
    .limit(1)

  return marked.length > 0
}

// The three the flush fills, written on the backed-up row rather than on the queued one, which is
// never written to after the append. The stage comes back in the source's answer and is never
// computed here, so none of the three can exist before this call.
//
// Only rows still unsent are touched: a replayed flush that reached the source twice would
// otherwise overwrite a stage with an older one, and the append-only table has no way back.
export async function markSent(
  ids: readonly string[],
  srsStageAfter: number,
  syncedAt: Date,
): Promise<number> {
  const marked = await (await db())
    .update(reviewEvent)
    .set({ srsStageAfter, appliedUpstream: true, syncedAt })
    .where(and(inArray(reviewEvent.id, [...ids]), isNull(reviewEvent.appliedUpstream)))
    .returning({ id: reviewEvent.id })

  return marked.length
}
