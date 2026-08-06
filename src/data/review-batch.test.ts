import { describe, expect, it } from 'vitest'

import { answerRecord } from '@/core/review/answer-record'
import type { AnsweredCard, AnswerStamp } from '@/core/review/answer-record'

import { parseBatch } from './review-batch'

// What the browser sends is a row it wrote offline, so the shape is the queue's rather than a
// wire format of its own, and the only difference between the two is what JSON can carry: a date
// leaves the device as text and has to come back a date, since the column it lands in is one.
//
// Built from the constructor rather than from a literal written here, for the reason
// schema.test.ts gives beside the same idea: a literal is a third place to keep in step.

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

// Through JSON, because that is the only way the route ever meets a row: asserting against the
// object the browser holds would test a journey the record never makes.
function sent(records: readonly unknown[]): unknown {
  return JSON.parse(JSON.stringify(records))
}

describe('parseBatch', () => {
  it('returns the rows a browser queued, with the date a date again', () => {
    const parsed = parseBatch(sent([answerRecord(CARD, STAMP)]))

    expect(parsed).toHaveLength(1)
    expect(parsed?.[0]?.id).toBe(STAMP.id)
    expect(parsed?.[0]?.answeredAt).toEqual(STAMP.answeredAt)
    expect(parsed?.[0]?.subjectId).toBe(CARD.subjectId)
  })

  it('refuses a row missing a field the column requires', () => {
    const [row] = sent([answerRecord(CARD, STAMP)]) as Record<string, unknown>[]
    delete row?.['correct']

    expect(parseBatch([row])).toBeNull()
  })

  it('refuses a batch that is not a list of rows', () => {
    const [row] = sent([answerRecord(CARD, STAMP)]) as unknown[]

    expect(parseBatch(row)).toBeNull()
    expect(parseBatch('[]')).toBeNull()
    expect(parseBatch(null)).toBeNull()
  })

  // The three the flush fills arrive null and are not the sender's to state: a browser claiming a
  // stage the source never returned would put a number nobody received into the only record that
  // will ever exist.
  it('refuses a row claiming what only the flush may write', () => {
    const [row] = sent([answerRecord(CARD, STAMP)]) as Record<string, unknown>[]

    expect(parseBatch([{ ...row, srsStageAfter: 3 }])).toBeNull()
    expect(parseBatch([{ ...row, appliedUpstream: true }])).toBeNull()
  })

  it('refuses an empty batch, a request with nothing to store being a caller mistake', () => {
    expect(parseBatch([])).toBeNull()
  })
})
