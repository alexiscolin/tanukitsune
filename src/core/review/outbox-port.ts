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
  // What a restart empties. Nothing else does: the queue is append-only, and a row leaves it
  // only once the flush that drains it exists.
  readonly clear: () => Promise<void>
}
