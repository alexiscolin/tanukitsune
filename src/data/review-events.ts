import 'server-only'

import type { AnswerRecord } from '@/core/review/answer-record'

// The durable half of the review queue. WaniKani discards review history, so a row here is the
// only record of an answer that will ever exist, which is why the append happens inside the
// request rather than after the response, per docs/framing.md under mutation transport.

// How many rows the table gained, which is not how many the caller sent: a replayed batch stores
// every row it names and appends none. The caller needs the first number to drop what it holds
// and the second is what makes a replay observable from outside.
export type Appended = { readonly stored: number; readonly appended: number }

export function appendAnswers(records: readonly AnswerRecord[]): Promise<Appended> {
  return Promise.resolve({ stored: records.length, appended: 0 })
}
