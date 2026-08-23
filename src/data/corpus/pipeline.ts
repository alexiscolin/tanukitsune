// The steps of one command, in the order each reads what the one before it wrote. Held here rather
// than in the script, because a run that resumes in the wrong place submits a batch a second time and
// pays for it twice, and `vitest` reads `src/` alone.
//
// Nothing here decides whether a step has work left. Every command already counts what it owes and is
// re-runnable by reflex, so a step with nothing to do costs a read and returns. Deciding it twice is
// how the count the command reports and the count this one assumes come apart.

export type Step = {
  readonly name: string
  // The batch this step writes down while it waits, or null where the step reaches no model.
  readonly batch: string | null
  // Whether the step reaches a model, which is what the run announces before it spends anything.
  readonly paid: boolean
}

export function stepsFor(locale: string): readonly Step[] {
  return [
    { name: 'corpus:decomposition', batch: null, paid: false },
    { name: 'corpus:inventory', batch: null, paid: false },
    { name: 'corpus:key-choice', batch: `corpus/${locale}/.key-choice-batch.json`, paid: true },
    { name: 'corpus:key-translation', batch: `corpus/${locale}/.key-translation-batch.json`, paid: true },
    { name: 'corpus:keys', batch: null, paid: false },
    { name: 'corpus:name', batch: `corpus/${locale}/.naming-batch.json`, paid: true },
    { name: 'corpus:report', batch: null, paid: false },
  ]
}

// The first step still holding a batch, since a later step reads what an earlier one writes and
// collecting out of order would judge answers against a corpus that has moved. Zero where none is
// waiting: the steps before it have nothing left to do and say so themselves.
export function resumeAt(steps: readonly Step[], waiting: (batch: string) => boolean): number {
  const first = steps.findIndex((one) => one.batch !== null && waiting(one.batch))

  return first === -1 ? 0 : first
}
