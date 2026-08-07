import type { AnswerKind } from '../answer-kind'
import type { AnswerRecord } from './answer-record'

// What the flush sends, worked out from the rows the backup holds. The unit is the subject and not
// the answer: WaniKani advances an item only when both its meaning and its reading have been
// answered, so a partial subject is held back until its pair arrives rather than submitted alone
// and corrected later. See docs/specs/v0.1.md, under offline and sync.
//
// The rows say what was answered and nothing says what was asked, so the caller hands that in: a
// radical is asked for its meaning alone, and a subject whose reading nothing accepts is never
// asked for one. Deriving it here would need the subject, which this layer does not hold.

export type Asked = {
  // Their submission names the assignment rather than the subject, so a subject with no assignment
  // in hand cannot be sent at all.
  readonly assignmentId: number
  readonly asks: readonly AnswerKind[]
}

export type Submission = {
  readonly assignmentId: number
  // Two counts rather than a verdict, which is the shape their API takes: how many times the
  // reader was wrong before they were right.
  readonly incorrectMeanings: number
  readonly incorrectReadings: number
  // Every row this submission answers for, so what came back can be written onto exactly those and
  // no others.
  readonly answers: readonly string[]
}

function wrongIn(records: readonly AnswerRecord[], kind: AnswerKind): number {
  return records.filter((record) => record.kind === kind && !record.correct).length
}

// Grouped in the order the subjects were first answered, so a sequence of submissions replays the
// sitting rather than an order the grouping happened to produce. Scheduling is order dependent.
function bySubject(records: readonly AnswerRecord[]): Map<number, AnswerRecord[]> {
  const grouped = new Map<number, AnswerRecord[]>()

  for (const record of records) {
    const held = grouped.get(record.subjectId)

    if (held === undefined) grouped.set(record.subjectId, [record])
    else held.push(record)
  }

  return grouped
}

export function submissionsFor(
  records: readonly AnswerRecord[],
  asked: ReadonlyMap<number, Asked>,
): readonly Submission[] {
  return [...bySubject(records)].flatMap(([subjectId, answers]) => {
    const owed = asked.get(subjectId)
    if (owed === undefined) return []

    // Every kind the subject is asked for has to be present. A row for a kind it is not asked for
    // does not make it ready and does not stop it either: it is counted where it lands.
    const given = new Set(answers.map((record) => record.kind))
    if (!owed.asks.every((kind) => given.has(kind))) return []

    return [
      {
        assignmentId: owed.assignmentId,
        incorrectMeanings: wrongIn(answers, 'meaning'),
        incorrectReadings: wrongIn(answers, 'reading'),
        answers: answers.map((record) => record.id),
      },
    ]
  })
}
