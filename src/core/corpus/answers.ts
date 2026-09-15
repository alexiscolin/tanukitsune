import { answerKey, wordKey } from '../grading/fuzzy.ts'

// What a locale accepts for each card besides the word the card shows, and which of those words the
// fuzzy tier may never reach for. Both rules read the answers as the grader reads them, through
// `answerKey`, so a word written with an accent here and typed without one there is one word.

// One card's answers: the word it shows, and every word the locale wrote for the same subject.
export type Wrote = {
  readonly shown: string
  readonly wrote: readonly string[]
}

// The corpus writes several words for most subjects and a card shows one. The rest are answers a
// reader who knows the meaning will type, except where the word answers a different card: a word
// another subject is shown under means that subject, and accepting it here would grade a mix-up as
// knowledge.
export function alsoAcceptedFor(answers: ReadonlyMap<string, Wrote>): ReadonlyMap<string, readonly string[]> {
  const cards = new Set([...answers.values()].map((one) => wordKey(one.shown)))

  return new Map(
    [...answers].map(([id, { wrote }]) => {
      const kept = new Map<string, string>()

      for (const word of wrote) {
        const key = wordKey(word)
        if (cards.has(key) || kept.has(key)) continue

        kept.set(key, word)
      }

      return [id, [...kept.values()]]
    }),
  )
}

// The words the fuzzy tier must not reach for, which is every word this locale answers some card with.
// Derived rather than curated: the pairs French punishes are the ones the curriculum happens to hold,
// and a hand-written list goes stale the moment a word is rewritten.
//
// All of them and not only the ones near each other. A card also accepts the source's own language,
// and a slip on one of those answers can land on a French word that nothing French sits near.
export function claimedWords(accepted: Iterable<string>): readonly string[] {
  return [...new Set([...accepted].map(answerKey))].filter((key) => key !== '').sort()
}
