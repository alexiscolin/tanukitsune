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

export async function drain(outbox: OutboxPort, backup: Backup): Promise<void> {
  await backup(await outbox.list())
}
