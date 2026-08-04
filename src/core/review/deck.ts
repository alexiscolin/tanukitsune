import type { Assignment } from '../knowledge-source'
import type { Subject } from '../subject'

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
    // Content the source has withdrawn is filtered out of a queue rather than handled by a card,
    // and both flows deal from here, so it leaves at the join rather than at one of the two.
    if (subject === undefined || subject.hidden) return []

    return [{ ...subject, srsStage: assignment.srsStage }]
  })
}
