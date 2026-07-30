import type { AnswerKind } from '../answer-kind'

// Non-empty by type: an item whose references did not load is a fetch failure for the
// interface to show, never an answer to grade against nothing. Named here because what
// supplies the references and what grades against them must ask for the same guarantee.
export type AcceptedAnswers = readonly [string, ...string[]]

export type GradedAnswer = {
  readonly kind: AnswerKind
  // Raw, as it was typed. Every tier normalises for its own comparison, and the
  // string written to a review event is the one the reader can be shown again.
  readonly answer: string
  readonly accepted: AcceptedAnswers
}

// What a tier concludes about an answer. Named beside the port for the reason the tuple
// above is: the cascade that produces one and the screen that holds it until the reader
// disagrees must not spell it apart.
export type Verdict = 'correct' | 'incorrect'

// Declared here rather than in ai/, so core/ never learns that a model exists.
// ai/ implements it, app/ wires the two, and the cascade is tested with a fake.
// A judge that cannot tell says so, and the reader decides instead.
export type JudgePort = {
  readonly judge: (answer: GradedAnswer) => Promise<Verdict | 'unsure'>
}
