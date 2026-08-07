import type { AnswerRecord } from './answer-record'

// The durable local queue, declared here so core/ never learns that IndexedDB exists. data/
// implements it over the browser's database and app/ wires the two, which is the same inversion
// `JudgePort` is under.
//
// `append` rejects rather than returning a failure, because there is one thing to do with either
// outcome and the caller has to await it either way: an answer that was not durably written is
// not accepted, so the card refuses instead of advancing.
export type OutboxPort = {
  readonly append: (record: AnswerRecord) => Promise<void>
  // Every row at once rather than a page of them. The order answers are replayed in belongs to
  // the drain, where a unit test can read it, rather than to an index only a browser has; and a
  // queue is one reader's unsent answers, which is tens of rows.
  readonly list: () => Promise<readonly AnswerRecord[]>
  // What the drain calls once the backup holds those rows, and the only way a row leaves the
  // queue on its own account. The queue stays append-only: nothing here rewrites a row.
  readonly remove: (ids: readonly string[]) => Promise<void>
  // What a restart empties, which is the demo deck and nothing else. A real account's answers
  // leave through `remove` alone.
  readonly clear: () => Promise<void>
}
