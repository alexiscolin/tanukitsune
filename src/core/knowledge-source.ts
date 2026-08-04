import type { Subject } from './subject'

// Where subjects and what the reader owes on them come from. WaniKani is one implementation of
// this and not the definition of it, which is the whole reason the interface exists: the product
// rests on one third-party API, and its disappearance is a second implementation rather than a
// rewrite. The argument is in docs/framing.md, under the architecture.

// What this reader has done with one subject, which the source keeps apart from what the subject
// is. The card reads its stage from here, and the row an answer becomes records the stage it had
// before the answer, which is a fact only the assignment carries.
export type Assignment = {
  readonly subjectId: number
  // Zero while the subject is unlocked and never studied, which is what makes it a lesson. The
  // source sends no assignment at all for a subject that is still locked.
  readonly srsStage: number
}

// The two lists, kept apart because a lesson teaches and a review asks, and because the source
// returns them as two rather than as one list with a flag on it.
export type Waiting = {
  readonly lessons: readonly Assignment[]
  readonly reviews: readonly Assignment[]
}

export type KnowledgeSource = {
  // By identifier, because what a session asks for is what is waiting. The subscription ceiling
  // is held behind this rather than beside it: reads are not filtered upstream, and a caller that
  // has to remember to filter is a caller that will forget. What that ceiling is for is in
  // docs/framing.md, under what WaniKani actually gives us.
  readonly listSubjects: (ids: readonly number[]) => Promise<readonly Subject[]>
  readonly listWaiting: () => Promise<Waiting>
}
