import { describe, expect, it } from 'vitest'

import type { AnswerKind } from '../answer-kind'
import type { AnswerRecord } from './answer-record'
import { submissionsFor } from './submission'
import type { Asked } from './submission'

// What the flush sends, decided here rather than at the boundary that sends it. The unit is the
// subject and not the answer, so the cases that matter are the ones where a subject is not ready:
// half of it answered, or an assignment nobody can name.

function answered(subjectId: number, kind: AnswerKind, correct: boolean, id = `${subjectId}-${kind}`) {
  return {
    id,
    subjectId,
    locale: 'fr',
    corpusVersion: null,
    answeredAt: new Date('2026-08-07T00:00:00Z'),
    kind,
    answer: 'something',
    verdict: correct ? 'correct' : 'incorrect',
    decidedBy: 'exact-1',
    correct,
    overriddenTo: null,
    overrideReason: null,
    assist: null,
    scheduled: null,
    srsStageBefore: 2,
    srsStageAfter: null,
    appliedUpstream: null,
    syncedAt: null,
  } satisfies AnswerRecord
}

const KANJI: Asked = { assignmentId: 8002, asks: ['meaning', 'reading'] }
const RADICAL: Asked = { assignmentId: 8001, asks: ['meaning'] }

describe('submissionsFor', () => {
  it('sends a radical on its meaning alone', () => {
    const submissions = submissionsFor(
      [answered(9001, 'meaning', true)],
      new Map([[9001, RADICAL]]),
    )

    expect(submissions).toEqual([
      { assignmentId: 8001, incorrectMeanings: 0, incorrectReadings: 0, answers: ['9001-meaning'] },
    ])
  })

  it('holds a subject back until the other half of it arrives', () => {
    const half = [answered(9002, 'meaning', true)]

    expect(submissionsFor(half, new Map([[9002, KANJI]]))).toEqual([])

    expect(
      submissionsFor([...half, answered(9002, 'reading', true)], new Map([[9002, KANJI]])),
    ).toHaveLength(1)
  })

  it('counts the wrong answers per kind, which is what their unit is', () => {
    const submissions = submissionsFor(
      [
        answered(9002, 'meaning', false, 'first'),
        answered(9002, 'meaning', true, 'second'),
        answered(9002, 'reading', false, 'third'),
        answered(9002, 'reading', false, 'fourth'),
        answered(9002, 'reading', true, 'fifth'),
      ],
      new Map([[9002, KANJI]]),
    )

    expect(submissions[0]?.incorrectMeanings).toBe(1)
    expect(submissions[0]?.incorrectReadings).toBe(2)
    // Every row the submission answers for, so the caller can mark exactly those and no others.
    expect(submissions[0]?.answers).toEqual(['first', 'second', 'third', 'fourth', 'fifth'])
  })

  // An answer whose assignment is not in hand cannot be sent at all: their submission names the
  // assignment, and inventing one would advance an item nobody answered.
  it('holds back an answer no assignment names', () => {
    expect(submissionsFor([answered(9003, 'meaning', true)], new Map())).toEqual([])
  })

  // A sitting answers several subjects, and each is its own submission: their API advances one
  // item per call, so a batch of ours is a sequence of theirs.
  it('sends one submission per subject', () => {
    const submissions = submissionsFor(
      [answered(9001, 'meaning', true), answered(9002, 'meaning', true), answered(9002, 'reading', true)],
      new Map([
        [9001, RADICAL],
        [9002, KANJI],
      ]),
    )

    expect(submissions.map((submission) => submission.assignmentId)).toEqual([8001, 8002])
  })
})
