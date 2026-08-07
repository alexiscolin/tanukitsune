import type { Subject } from './subject'

// Where subjects and what the reader owes on them come from. WaniKani is one implementation of
// this and not the definition of it, which is the whole reason the interface exists: the product
// rests on one third-party API, and its disappearance is a second implementation rather than a
// rewrite. The argument is in docs/framing.md, under the architecture.

// What this reader has done with one subject, which the source keeps apart from what the subject
// is. The card reads its stage from here, and the row an answer becomes records the stage it had
// before the answer, which is a fact only the assignment carries.
export type Assignment = {
  // What a submission names, the source advancing an assignment rather than a subject. It is read
  // by the flush alone, a deck naming its cards by subject.
  readonly id: number
  readonly subjectId: number
  // Zero while the subject is unlocked and never studied, which is what makes it a lesson. The
  // source sends no assignment at all for a subject that is still locked.
  readonly srsStage: number
}

// What one submission produced, which is the stage and nothing else: everything else in their
// answer is a copy of what was sent. The stage comes back from them and is never computed here,
// scheduling being theirs until v0.2 replaces it.
export type Advanced = {
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
  // The write half, and the only one there is: an answer is submitted per assignment with two
  // counts of wrong answers, where ours is a row per question. What aggregates the one into the
  // other is review/submission.ts.
  //
  // It resolves or it throws. There is no outcome that means "perhaps": their created review
  // carries no identifier worth reading back, so a failure nobody can classify is settled by
  // reading the assignment again and never by sending the same submission twice.
  readonly submitReview: (submission: {
    readonly assignmentId: number
    readonly incorrectMeanings: number
    readonly incorrectReadings: number
  }) => Promise<Advanced>
}
