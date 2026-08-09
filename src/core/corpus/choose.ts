import type { Allocated } from './allocation'

// Which word stands for which reading, decided over the whole curriculum before a word of prose
// exists. The rules in `anchor.ts` say whether one word can stand for one reading; this says which of
// the words that can, does, and it is a different question: anchors are a shared resource, and a good
// word spent on an easy reading is a scarce reading left with nothing.

export type Candidate = {
  readonly text: string
  // Derived from the language's own lexicon, never from what a model said the word sounds like.
  readonly phonemes: readonly string[]
  readonly frequency: number
}

export type Wanted = {
  readonly value: string
  readonly phonemes: readonly string[]
}

export type Limits = {
  // How far a word may sit from the reading and still be heard in it.
  readonly nearest: number
  // How far two anchors must sit from each other, which is what stops one cue answering twice.
  readonly apart: number
  // What the language cannot begin a word with, from that locale's own material.
  readonly cannotStart: readonly string[]
}

export function allocate(
  _readings: readonly Wanted[],
  _candidatesFor: (reading: Wanted) => readonly Candidate[],
  _limits: Limits,
): { readonly allocated: readonly Allocated[]; readonly unserved: readonly string[] } {
  return { allocated: [], unserved: [] }
}
