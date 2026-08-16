import type { Shape } from './name'

// The word a subject is taught and graded on, one per subject and one subject per word. It is
// selected from a gloss the source already states rather than invented, per docs/corpus.md: an
// invented key is a key no dictionary agrees with, and the reader's account grades the same character.
//
// Nothing is settled in silence. A character whose every gloss is already spoken for is reported, so a
// later run or a hand can settle it.

// What a key has to be before anybody is graded on it. It is the sibling of `faultInName`, minus the
// article: a name is a thing in a story, la lune, and a key is the word the reader types, lune, so
// demanding an article here would refuse every key a grader accepts.
export type KeyFault = 'not the locale' | 'nothing to read'

export function faultInKey(word: string, shape: Shape): KeyFault | null {
  const written = word.toLowerCase().trim()

  if ([...written].some((one) => one !== ' ' && !shape.letters.includes(one) && !shape.joiners.includes(one))) {
    return 'not the locale'
  }
  if (![...written].some((one) => shape.letters.includes(one))) return 'nothing to read'

  return null
}

export type Keyed = {
  readonly keys: Readonly<Record<string, string>>
  readonly unsettled: readonly string[]
}

export function chooseKeys(
  characters: readonly string[],
  glossesOf: (character: string) => readonly string[],
  // The characters that also name a shape stories are built from. A shape is met inside every character
  // containing it while a leaf kanji is met once, so it is rescued first below where both want the same
  // word. Empty is a locale that names no shape of its own, which only changes the order.
  naming: ReadonlySet<string> = new Set(),
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

  // The rescue, run once the walk is done rather than as an order over it. A character left with no
  // word takes one back from a holder that has another gloss free, and only that one key moves:
  // serving everybody in this order from the start would reorder the whole curriculum instead.
  //
  // The shapes stories name go first, since a rescue can only move a holder that has somewhere to go
  // and whoever is asked first has the most room. Nobody is left out: a card nobody can be graded on is
  // worse than a card on its second choice.
  // Who holds each word, kept beside the keys rather than searched for: a scan of every key per gloss
  // per character costs the square of the curriculum, which is the cost composedBy exists not to pay.
  const holders = new Map(Object.entries(keys).map(([character, word]) => [word.toLowerCase(), character]))
  const left: string[] = []
  const first = unsettled.filter((one) => naming.has(one))

  for (const character of [...first, ...unsettled.filter((one) => !naming.has(one))]) {
    if (rescued(character, { keys, holders, taken }, glossesOf) === null) left.push(character)
  }

  return { keys, unsettled: left }
}

// The first gloss of this character whose holder can step sideways, applied to both of them. Nothing
// where no holder can move, which leaves the character reported rather than another one displaced.
// What the walk settled, and who holds what, together because a rescue moves all three at once.
type Board = {
  readonly keys: Record<string, string>
  readonly holders: Map<string, string>
  readonly taken: Set<string>
}

function rescued(
  character: string,
  { keys, holders, taken }: Board,
  glossesOf: (character: string) => readonly string[],
): string | null {
  for (const wanted of glossesOf(character)) {
    const holder = holders.get(wanted.toLowerCase())
    if (holder === undefined) continue

    const moved = glossesOf(holder).find((one) => !taken.has(one.toLowerCase()))
    if (moved === undefined) continue

    keys[holder] = moved
    keys[character] = wanted
    taken.add(moved.toLowerCase())
    holders.set(moved.toLowerCase(), holder)
    holders.set(wanted.toLowerCase(), character)

    return wanted
  }

  return null
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
