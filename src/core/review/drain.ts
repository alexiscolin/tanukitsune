import { BATCH_LIMIT } from '../routes'
import type { AnswerRecord } from './answer-record'
import type { OutboxPort } from './outbox-port'

// What a batch is handed to, declared here so core/ never learns that the backup is an HTTP
// route. app/ implements it over the network, which is the inversion `OutboxPort` is under.
//
// True means every row in that batch is durable on the server. A refusal and a server that could
// not be reached are one answer to the queue, so nothing tells them apart: no outcome would make
// it drop a row. WaniKani discards review history, so a queued answer is the only record of
// itself that will ever exist, and a batch this server cannot read is a defect to fix rather
// than an answer to lose.
export type Backup = (batch: readonly AnswerRecord[]) => Promise<boolean>

// Oldest first, because scheduling is order dependent and the log is replayed in the order the
// answers were given in. Ties break on the identifier so two answers stamped on the same
// millisecond still have one order, rather than the order a store happened to hand them back in.
function oldestFirst(one: AnswerRecord, other: AnswerRecord): number {
  return one.answeredAt.getTime() - other.answeredAt.getTime() || one.id.localeCompare(other.id)
}

// Empties the queue into the backup, in batches the route accepts, and removes a row only once the
// server holds it. Serial rather than concurrent, and it stops where it failed: sending the rest
// after a refusal would put the newest answers on the server while the oldest stayed behind.
//
// The queue is read once. An answer appended while this runs belongs to the next trigger, so a
// reader answering faster than the network cannot hold a drain open indefinitely.
export async function drain(outbox: OutboxPort, backup: Backup): Promise<void> {
  const queued = [...(await outbox.list())].sort(oldestFirst)

  for (let sent = 0; sent < queued.length; sent += BATCH_LIMIT) {
    const batch = queued.slice(sent, sent + BATCH_LIMIT)

    if (!(await backup(batch))) return

    await outbox.remove(batch.map((record) => record.id))
  }
}
