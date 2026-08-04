import { describe, expect, it } from 'vitest'

import { answerRecord } from './answer-record'
import type { AnsweredCard, AnswerStamp } from './answer-record'

// What the screen hands over, and what the writer stamps on it. The two are separate because
// the screen knows what was asked and what was said, and nothing about which reference the
// answer was graded against or what identifies the row.
const CARD: AnsweredCard = {
  subjectId: 451,
  kind: 'meaning',
  answer: 'dessous',
  verdict: 'correct',
  decidedBy: 'exact:2',
  said: 'correct',
  srsStageBefore: 3,
}

const STAMP: AnswerStamp = {
  id: '5a4d2e5e-52a6-4a7f-8f52-6b4c0a8a2f11',
  locale: 'fr',
  corpusVersion: null,
  answeredAt: new Date('2026-08-04T09:15:00.000Z'),
}

// Every field docs/specs/v0.1.md names on `review_event`. Asserted as a set rather than one
// by one, because what this guards is the one thing an append-only table cannot repair: a
// column absent the day a row is written is never filled afterwards.
const FIELDS = [
  'id',
  'subjectId',
  'locale',
  'corpusVersion',
  'answeredAt',
  'kind',
  'answer',
  'verdict',
  'decidedBy',
  'correct',
  'overriddenTo',
  'overrideReason',
  'assist',
  'scheduled',
  'srsStageBefore',
  'srsStageAfter',
  'appliedUpstream',
  'syncedAt',
]

describe('answerRecord', () => {
  it('carries every field the review event names, whether or not anything writes it yet', () => {
    expect(Object.keys(answerRecord(CARD, STAMP)).sort()).toEqual([...FIELDS].sort())
  })

  it('overrides nothing when the reader ruled the way the cascade did', () => {
    const record = answerRecord(CARD, STAMP)

    expect(record.verdict).toBe('correct')
    expect(record.overriddenTo).toBeNull()
    expect(record.correct).toBe(true)
  })

  // The labelled disagreement the calibration set is built from, on exactly the hard middle
  // where a grader is worth correcting. Neither half can be rebuilt from the other.
  it('keeps both halves when the reader ruled against the cascade', () => {
    const record = answerRecord({ ...CARD, said: 'incorrect' }, STAMP)

    expect(record.verdict).toBe('correct')
    expect(record.overriddenTo).toBe('incorrect')
    expect(record.correct).toBe(false)
  })

  // A reader ruling where no tier could is not disagreeing with one. Reading that row as an
  // override would put it in the calibration set as a disagreement nobody had.
  it('records no override when no tier decided, and still records what the reader said', () => {
    const record = answerRecord(
      { ...CARD, verdict: null, decidedBy: null, said: 'incorrect' },
      STAMP,
    )

    expect(record.verdict).toBeNull()
    expect(record.overriddenTo).toBeNull()
    expect(record.correct).toBe(false)
  })

  // Before the normalisation each tier applies for its own comparison. The table is
  // append-only, so a normalised answer freezes the rule that produced it and the case can no
  // longer be re-graded the day that rule changes.
  it('keeps the answer as it was typed', () => {
    expect(answerRecord({ ...CARD, answer: '  DESSOUS ' }, STAMP).answer).toBe('  DESSOUS ')
  })

  // Giving up is not answering: nothing was typed and no tier was asked, which is a different
  // row from an answer that was written and refused.
  it('writes nothing typed and nothing decided when the reader gave up', () => {
    const record = answerRecord({ ...CARD, answer: null, verdict: null, decidedBy: null }, STAMP)

    expect(record.answer).toBeNull()
    expect(record.decidedBy).toBeNull()
  })

  it('records which reference the answer was graded against, and when it was answered', () => {
    const record = answerRecord(CARD, STAMP)

    expect(record.id).toBe(STAMP.id)
    expect(record.locale).toBe('fr')
    expect(record.corpusVersion).toBeNull()
    expect(record.answeredAt).toEqual(STAMP.answeredAt)
    expect(record.srsStageBefore).toBe(3)
  })

  // The three fields the flush fills, which cannot exist before it: the stage comes back in
  // the source's response and is never computed locally.
  it('leaves what the flush returns empty', () => {
    const record = answerRecord(CARD, STAMP)

    expect(record.srsStageAfter).toBeNull()
    expect(record.appliedUpstream).toBeNull()
    expect(record.syncedAt).toBeNull()
  })
})
