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
  // When it comes back up for review, which is null for a lesson nobody has started.
  readonly availableAt: Date | null
  readonly startedAt: Date | null
}

// The two lists, kept apart because a lesson teaches and a review asks, and because the source
// returns them as two rather than as one list with a flag on it.
export type Waiting = {
  readonly lessons: readonly Assignment[]
  readonly reviews: readonly Assignment[]
}

// By identifier for a session, which asks about what is waiting, and by level for the corpus
// generation, which walks a curriculum. One shape rather than two operations, so a source
// implements the question once.
export type SubjectQuery =
  | { readonly ids: readonly number[] }
  | { readonly levels: readonly number[] }

export type KnowledgeSource = {
  // The highest level this reader's own subscription grants. Read rather than assumed: reads are
  // not filtered upstream, so a free account is sent the whole curriculum and holding the line is
  // ours. What it is for is in docs/framing.md, under what WaniKani actually gives us.
  readonly grantedLevel: () => Promise<number>
  readonly listSubjects: (query: SubjectQuery) => Promise<readonly Subject[]>
  readonly listWaiting: () => Promise<Waiting>
}
