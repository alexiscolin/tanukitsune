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
  // What the step reads after its own name. Three of them read that position as something other than a
  // locale, so one shape for all seven hands a release path where a locale was meant.
  readonly takes: 'nothing' | 'levels' | 'locale' | 'locale and most'
}

// A step reaching a model is a step leaving a batch behind, so what a run announces before it spends
// anything is read off that rather than said a second time and kept in step by hand.
export function paid(step: Step): boolean {
  return step.batch !== null
}

export function stepsFor(locale: string): readonly Step[] {
  return [
    { name: 'corpus:decomposition', batch: null, takes: 'nothing' },
    { name: 'corpus:inventory', batch: null, takes: 'levels' },
    { name: 'corpus:lexicon', batch: null, takes: 'locale' },
    { name: 'corpus:key-choice', batch: `corpus/${locale}/.key-choice-batch.json`, takes: 'locale and most' },
    { name: 'corpus:key-translation', batch: `corpus/${locale}/.key-translation-batch.json`, takes: 'locale and most' },
    { name: 'corpus:keys', batch: null, takes: 'locale' },
    { name: 'corpus:name', batch: `corpus/${locale}/.naming-batch.json`, takes: 'locale and most' },
    { name: 'corpus:vocabulary', batch: null, takes: 'locale' },
    { name: 'corpus:word', batch: `corpus/${locale}/.word-batch.json`, takes: 'locale and most' },
    { name: 'corpus:report', batch: null, takes: 'locale' },
  ]
}

// The first step still holding a batch, since a later step reads what an earlier one writes and
// collecting out of order would judge answers against a corpus that has moved. Zero where none is
// waiting: the steps before it have nothing left to do and say so themselves.
export function resumeAt(steps: readonly Step[], waiting: (batch: string) => boolean): number {
  const first = steps.findIndex((one) => one.batch !== null && waiting(one.batch))

  return first === -1 ? 0 : first
}

// What follows the step's name on the command line. The bound is left out where none was given rather
// than sent as the word Infinity, and the level ceiling is carried rather than left to the inventory
// command's own default of ten, which would rewrite sixty levels of curriculum as ten.
export function argumentsFor(step: Step, locale: string, most: number, levels: number): readonly string[] {
  if (step.takes === 'nothing') return []
  if (step.takes === 'levels') return [String(levels)]
  if (step.takes === 'locale') return [locale]

  return most === Infinity ? [locale] : [locale, String(most)]
}

// The batch a step writes down while it waits, asked of the table rather than spelled again in the
// step itself. Spelled twice, a rename leaves the run resuming from the start and paying for a batch
// already in flight, which is the one failure this table exists to prevent.
export function batchFor(name: string, locale: string): string {
  const found = stepsFor(locale).find((one) => one.name === name)?.batch

  if (found === undefined || found === null) throw new Error(`${name} writes down no batch`)

  return found
}
