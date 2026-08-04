import type { Assignment } from '../knowledge-source'
import type { Subject } from '../subject'

// How much of a queue one sitting takes. The source hands back everything that is due, which is
// the shape of their API rather than the shape of a day: a queue of hundreds is not a session, it
// is a screen nobody finishes. Ten is the length until the reader chooses it themselves, which
// docs/backlog.md holds for v0.1.1.
export const SESSION_LENGTH = 10

// The front of the queue as the source lists it, which is not the same as the most urgent: their
// collections are paged by identifier and an assignment carries no order of its own here. Dealing
// by how long an item has been due needs `available_at`, which docs/backlog.md holds.
export function sessionOf(waiting: readonly Assignment[]): readonly Assignment[] {
  return waiting.slice(0, SESSION_LENGTH)
}

// What a session is dealt, which neither half of the source's answer holds on its own: the queue
// says what is waiting and in what order, the subjects say what each one is, and the stage is
// what this reader has done with it. The join is here rather than in the route because it is a
// rule and not plumbing, and because a screen dealing a card with nothing behind it is the one
// failure this drops instead of rendering.
export function deckFor(
  waiting: readonly Assignment[],
  subjects: readonly Subject[],
): readonly Subject[] {
  const known = new Map(subjects.map((subject) => [subject.id, subject]))

  return waiting.flatMap((assignment) => {
    const subject = known.get(assignment.subjectId)
    // Content the source has withdrawn is filtered out of a queue rather than handled by a card.
    // `questionsFor` holds the same line for a deck that never passed through here, which the
    // seeded one does not.
    if (subject === undefined || subject.hidden) return []

    return [{ ...subject, srsStage: assignment.srsStage }]
  })
}
