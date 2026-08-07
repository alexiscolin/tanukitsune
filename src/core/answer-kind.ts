// Travels with the answer from the field it was typed in through to the verdict.
// See docs/specs/v0.1.md, the judge section, for what each kind is graded by.
// The values beside the type, in the shape locales.ts uses, because a boundary reading a row
// back from a device has to reject a kind nobody defined and a type alone cannot say which
// those are.
export const ANSWER_KINDS = ['meaning', 'reading'] as const

export type AnswerKind = (typeof ANSWER_KINDS)[number]
