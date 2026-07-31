import type { AnswerKind } from './answer-kind'
import type { AcceptedAnswers } from './grading/judge-port'

// One entry is one question, so a subject appears once for its meaning and once for its
// reading. `subjectId` is what says two entries are the same subject, and pairing them is
// a submission rule that lives at the flush rather than on the screen: WaniKani advances
// an item only once both of its answers have arrived.
//
// A question, not an answer. The review queue in docs/specs/v0.1.md is the append-only log
// of answers on their way out, which travels the other direction and will want that name.
export type ReviewEntry = {
  readonly subjectId: string
  // What the reader is shown, which is not what identifies the subject: a radical and a
  // kanji can be written with the same character.
  readonly characters: string
  readonly kind: AnswerKind
  readonly accepted: AcceptedAnswers
}
