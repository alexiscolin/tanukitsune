import type { AnswerKind } from '../answer-kind'

export type GradedAnswer = {
  readonly kind: AnswerKind
  // Raw, as it was typed. Every tier normalises for its own comparison, and the
  // string written to a review event is the one the reader can be shown again.
  readonly answer: string
  // Non-empty by type: an item whose references did not load is a fetch failure
  // for the interface to show, never an answer to grade against nothing.
  readonly accepted: readonly [string, ...string[]]
}

// Declared here rather than in ai/, so core/ never learns that a model exists.
// ai/ implements it, app/ wires the two, and the cascade is tested with a fake.
// A judge that cannot tell says so, and the reader decides instead.
export type JudgePort = {
  readonly judge: (answer: GradedAnswer) => Promise<'correct' | 'incorrect' | 'unsure'>
}
