import { answerKey, oneEditApart, SHORTEST_TYPO } from '../grading/fuzzy.ts'

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
  const cards = new Set([...answers.values()].map((one) => answerKey(one.shown)))

  return new Map(
    [...answers].map(([id, { wrote }]) => {
      const kept = new Map<string, string>()

      for (const word of wrote) {
        const key = answerKey(word)
        if (cards.has(key) || kept.has(key)) continue

        kept.set(key, word)
      }

      return [id, [...kept.values()]]
    }),
  )
}

// The words the fuzzy tier must not reach for, which is every answer another answer sits within one
// edit of. Derived rather than curated: the pairs French punishes are the ones the curriculum happens
// to hold, and a hand-written list goes stale the moment a word is rewritten.
//
// The whole set is not needed. A near miss only reaches the guard when it sits one edit from the
// reference, so a word with no neighbour can never be the answer that has to be refused.
export function claimedWords(accepted: Iterable<string>): readonly string[] {
  const written = new Map<string, Set<string>>()

  for (const word of accepted) {
    const key = answerKey(word)
    if (key === '') continue

    written.set(key, (written.get(key) ?? new Set()).add(word))
  }

  const keys = [...written.keys()]
  // Two answers the fold reads as one word, which is the pair an accent makes: the exact tier refuses
  // the unaccented spelling and this is the only thing standing between the reader and the other card.
  const claimed = new Set(keys.filter((key) => (written.get(key)?.size ?? 0) > 1))

  for (const [index, one] of keys.entries()) {
    for (const other of keys.slice(index + 1)) {
      if (!oneEditApart(one, other)) continue

      // Only where a typo could be taken for the other word. Below that length the tier refuses on
      // length alone, so naming the pair here would grow the artifact without changing a verdict.
      if (other.length >= SHORTEST_TYPO) claimed.add(one)
      if (one.length >= SHORTEST_TYPO) claimed.add(other)
    }
  }

  return [...claimed].sort()
}
