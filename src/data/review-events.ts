import 'server-only'

import type { AnswerRecord } from '@/core/review/answer-record'

import { and, inArray, isNull } from 'drizzle-orm'
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

// The rows the source has not been told about and nothing is currently telling it about, oldest
// first because scheduling is order dependent. `applied_upstream` is null until an outcome is known,
// and `synced_at` is stamped the moment a walk takes the row, so the two together say unresolved and
// unclaimed. A row carrying a claim belongs to a walk in flight and is nobody else's to send.
export async function unsentAnswers(): Promise<readonly Answered[]> {
  const rows = await (await db())
    .select({
      id: reviewEvent.id,
      subjectId: reviewEvent.subjectId,
      kind: reviewEvent.kind,
      correct: reviewEvent.correct,
    })
    .from(reviewEvent)
    .where(and(isNull(reviewEvent.appliedUpstream), isNull(reviewEvent.syncedAt)))
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

// Takes the rows for one submission, and the taking is what makes two walks safe: the statement is
// one atomic update, so of two flushes reaching the same rows exactly one is handed them and the
// other is handed nothing. A submission is irreversible, so this runs before the send and never
// after it.
//
// What it returns is what the caller owns. Fewer rows than asked for means somebody else owns them,
// and the answer is to send nothing rather than to send what is left of a subject.
export async function claimForFlush(ids: readonly string[], at: Date): Promise<number> {
  const claimed = await (await db())
    .update(reviewEvent)
    .set({ syncedAt: at })
    .where(
      and(
        inArray(reviewEvent.id, [...ids]),
        isNull(reviewEvent.appliedUpstream),
        isNull(reviewEvent.syncedAt),
      ),
    )
    .returning({ id: reviewEvent.id })

  return claimed.length
}

// Puts back what a walk took and could not resolve, so the next one may try again. Only a walk
// holding the claim calls this, which is what keeps it from freeing somebody else's rows.
export async function releaseClaim(ids: readonly string[]): Promise<number> {
  const freed = await (await db())
    .update(reviewEvent)
    .set({ syncedAt: null })
    .where(and(inArray(reviewEvent.id, [...ids]), isNull(reviewEvent.appliedUpstream)))
    .returning({ id: reviewEvent.id })

  return freed.length
}

// The three the flush fills, written on the backed-up row rather than on the queued one, which is
// never written to after the append. The stage comes back in the source's answer and is never
// computed here, so none of the three can exist before this call.
//
// Only rows still unsent are touched: a replayed flush that reached the source twice would
// otherwise overwrite a stage with an older one, and the append-only table has no way back.
export function markSent(
  ids: readonly string[],
  srsStageAfter: number | null,
  syncedAt: Date,
): Promise<number> {
  return mark(ids, { srsStageAfter, appliedUpstream: true, syncedAt })
}

// The source refused the item as no longer due. The answer keeps its outcome in our history and
// says it never reached them, which docs/framing.md calls a drop rather than an error: there is no
// stage, because none was produced.
export function markDropped(ids: readonly string[]): Promise<number> {
  return mark(ids, { srsStageAfter: null, appliedUpstream: false, syncedAt: null })
}

async function mark(
  ids: readonly string[],
  outcome: { srsStageAfter: number | null; appliedUpstream: boolean; syncedAt: Date | null },
): Promise<number> {
  const marked = await (await db())
    .update(reviewEvent)
    .set(outcome)
    .where(and(inArray(reviewEvent.id, [...ids]), isNull(reviewEvent.appliedUpstream)))
    .returning({ id: reviewEvent.id })

  return marked.length
}
