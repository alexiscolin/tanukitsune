import { describe, expect, it } from 'vitest'

import { BATCH_LIMIT } from '../routes'
import { answerRecord } from './answer-record'
import type { AnsweredCard, AnswerRecord } from './answer-record'
import { drain } from './drain'
import type { Backup } from './drain'
import type { OutboxPort } from './outbox-port'

// One answered card, since what varies here is when a row was answered and what identifies it,
// never what it says.
const CARD: AnsweredCard = {
  subjectId: 451,
  kind: 'meaning',
  answer: 'dessous',
  verdict: 'correct',
  decidedBy: 'exact:2',
  said: 'correct',
  srsStageBefore: 3,
}

const MINUTE = 60_000
const EPOCH = Date.parse('2026-08-04T09:00:00.000Z')

// Rows in the order a store hands them back, which is not the order they were answered in: the
// browser keys the queue on an identifier that carries no time. So the identifiers ascend while
// the answers descend, and an implementation that returned the queue untouched would read as
// ordered until this told them apart.
function newestFirst(count: number): readonly AnswerRecord[] {
  return Array.from({ length: count }, (_, index) =>
    answerRecord(CARD, {
      id: `answer-${String(index).padStart(4, '0')}`,
      locale: 'fr',
      corpusVersion: null,
      answeredAt: new Date(EPOCH + (count - index) * MINUTE),
    }),
  )
}

// The queue as the drain sees it. `append` and `clear` reject, since a drain that wrote to the
// queue it is emptying is a defect this reports rather than absorbs.
function outboxOf(records: readonly AnswerRecord[]) {
  const rows = new Map(records.map((record) => [record.id, record]))

  const port: OutboxPort = {
    append: () => Promise.reject(new Error('The drain appended to the queue.')),
    clear: () => Promise.reject(new Error('The drain cleared the queue.')),
    list: () => Promise.resolve([...rows.values()]),
    remove: (ids) => {
      for (const id of ids) rows.delete(id)

      return Promise.resolve()
    },
  }

  return { port, held: () => [...rows.keys()] }
}

// The backup, recording what it was handed so the order and the batching are readable, and
// answering the same way every time.
function backupOf(stored: boolean) {
  const batches: (readonly AnswerRecord[])[] = []

  const backup: Backup = (batch) => {
    batches.push(batch)

    return Promise.resolve(stored)
  }

  return { backup, batches, sent: () => batches.flat().map((record) => record.id) }
}

describe('drain', () => {
  // A trigger fires on every reconnection and every return to the tab, most of them against a
  // queue that is already empty. A request carrying nothing is one the route answers with a 400,
  // the batch it parses being non-empty by definition.
  it('sends nothing when the queue is empty', async () => {
    const outbox = outboxOf([])
    const backup = backupOf(true)

    await drain(outbox.port, backup.backup)

    expect(backup.batches).toEqual([])
  })

  // Scheduling is order dependent, so the log is replayed in the order the answers were given
  // in rather than the order a store happens to return.
  it('hands the oldest answer over first', async () => {
    const outbox = outboxOf(newestFirst(3))
    const backup = backupOf(true)

    await drain(outbox.port, backup.backup)

    expect(backup.sent()).toEqual(['answer-0002', 'answer-0001', 'answer-0000'])
  })

  it('removes what the backup stored', async () => {
    const outbox = outboxOf(newestFirst(3))

    await drain(outbox.port, backupOf(true).backup)

    expect(outbox.held()).toEqual([])
  })

  // The queue is what stands between an answer and nothing at all, so a row leaves it on the
  // server's word and never on the send having been attempted.
  it('leaves every row where the backup refused the batch', async () => {
    const outbox = outboxOf(newestFirst(3))

    await drain(outbox.port, backupOf(false).backup)

    expect(outbox.held()).toHaveLength(3)
  })

  // The route refuses a batch past its limit, so a queue longer than one is paged rather than
  // sent whole and refused whole.
  it('pages a queue longer than one batch, still oldest first', async () => {
    const outbox = outboxOf(newestFirst(BATCH_LIMIT + 2))
    const backup = backupOf(true)

    await drain(outbox.port, backup.backup)

    expect(backup.batches.map((batch) => batch.length)).toEqual([BATCH_LIMIT, 2])
    expect(backup.sent()[0]).toBe(`answer-${String(BATCH_LIMIT + 1).padStart(4, '0')}`)
  })

  // What a refusal leaves behind is one batch attempted and the rest of the queue untouched.
  it('stops at the batch the backup refused', async () => {
    const outbox = outboxOf(newestFirst(BATCH_LIMIT + 2))
    const backup = backupOf(false)

    await drain(outbox.port, backup.backup)

    expect(backup.batches).toHaveLength(1)
    expect(outbox.held()).toHaveLength(BATCH_LIMIT + 2)
  })
})
