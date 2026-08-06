import { getTableColumns } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { answerRecord } from '@/core/review/answer-record'
import type { AnsweredCard, AnswerStamp } from '@/core/review/answer-record'

import { reviewEvent } from './schema'

// The table and the row the browser queues are one shape in two places, and nothing but this
// holds them together: the flush reads a record written offline and writes these columns, so a
// field that exists on one side and not the other is a queue that cannot be drained.
//
// Built from the constructor rather than from a list written here, because a list is a third
// place to keep in step.

const CARD: AnsweredCard = {
  subjectId: 451,
  kind: 'meaning',
  answer: 'dessous',
  verdict: 'correct',
  decidedBy: 'exact@1',
  said: 'correct',
  srsStageBefore: 2,
}

const STAMP: AnswerStamp = {
  id: '6f1c2e14-0a3f-4a1e-9c5b-2d7f8a0b1c3d',
  locale: 'fr',
  corpusVersion: null,
  answeredAt: new Date('2026-08-04T10:00:00.000Z'),
}

function snake(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

// The one column the queued row cannot carry, because a device stamping its own receipt time is
// the thing that column exists to check. Named here rather than tolerated by a looser comparison,
// so a second column arriving without a row behind it still fails.
const STAMPED_BY_THE_SERVER = ['received_at']

describe('review_event', () => {
  it('holds every field the queued row carries, and only what the server stamps besides', () => {
    const columns = Object.values(getTableColumns(reviewEvent)).map((column) => column.name)
    const fields = Object.keys(answerRecord(CARD, STAMP)).map(snake)

    expect([...columns].sort()).toEqual([...fields, ...STAMPED_BY_THE_SERVER].sort())
  })

  it('defaults the receipt so no caller can send one', () => {
    const received = getTableColumns(reviewEvent).receivedAt

    expect(received.notNull).toBe(true)
    expect(received.hasDefault).toBe(true)
  })

  // The three the flush fills. A column that refused a null could not take the row until an
  // answer had been sent, which is the opposite of an append-only queue written offline.
  it('leaves the three the flush fills nullable, and the append itself not', () => {
    const columns = getTableColumns(reviewEvent)

    expect(columns.srsStageAfter.notNull).toBe(false)
    expect(columns.appliedUpstream.notNull).toBe(false)
    expect(columns.syncedAt.notNull).toBe(false)
    expect(columns.id.primary).toBe(true)
    expect(columns.correct.notNull).toBe(true)
  })
})
