import 'server-only'

import type { AnswerRecord } from '@/core/review/answer-record'

import { db } from './db'
import { reviewEvent } from './schema'

// The durable half of the review queue. WaniKani discards review history, so a row here is the
// only record of an answer that will ever exist, which is why the append happens inside the
// request rather than after the response, per docs/framing.md under mutation transport.

// How many rows the table gained, which is not how many the caller sent: a replayed batch appends
// none and every row it named is durable either way. The caller learns that from the status, so
// the count is here for what nothing else can see from outside, whether a batch was new.
export type Appended = { readonly appended: number }

export async function appendAnswers(records: readonly AnswerRecord[]): Promise<Appended> {
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

  return { appended: appended.length }
}
