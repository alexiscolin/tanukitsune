// The word a subject is taught and graded on, one per subject and one subject per word. It is
// selected from a gloss the source already states rather than invented, per docs/corpus.md: an
// invented key is a key no dictionary agrees with, and the reader's account grades the same character.
//
// Nothing is settled in silence. A character whose every gloss is already spoken for is reported, so a
// later run or a hand can settle it.

export type Keyed = {
  readonly keys: Readonly<Record<string, string>>
  readonly unsettled: readonly string[]
}

export function chooseKeys(
  characters: readonly string[],
  glossesOf: (character: string) => readonly string[],
): Keyed {
  const keys: Record<string, string> = {}
  const unsettled: string[] = []
  const taken = new Set<string>()

  for (const character of characters) {
    // Folded, because two keys differing only in case are one key to a reader and to a grader.
    const free = glossesOf(character).find((gloss) => !taken.has(gloss.toLowerCase()))

    if (free === undefined) {
      unsettled.push(character)
      continue
    }

    keys[character] = free
    taken.add(free.toLowerCase())
  }

  return { keys, unsettled }
}

// Whether an order is a reordering of exactly these glosses, inventing, dropping or repeating none.
// It is what makes a stored order safe to walk: a release that restates a character, or a rule that
// cleans a gloss, leaves an order naming words that are no longer there, and an order that no longer
// describes the glosses is not one.
export function isOrderOf(order: readonly string[], glosses: readonly string[]): boolean {
  if (order.length !== glosses.length) return false

  const left = new Set(glosses)

  return order.every((gloss) => left.delete(gloss))
}
