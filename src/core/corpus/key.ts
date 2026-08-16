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
export type KeyFault = 'not the locale' | 'nothing to read' | 'too long'

export function faultInKey(word: string, shape: Shape): KeyFault | null {
  const written = word.toLowerCase().trim()

  if ([...written].some((one) => one !== ' ' && !shape.letters.includes(one) && !shape.joiners.includes(one))) {
    return 'not the locale'
  }
  if (![...written].some((one) => shape.letters.includes(one))) return 'nothing to read'
  if (written.split(' ').length > shape.mostWords) return 'too long'

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
  // containing it while a leaf kanji is met once, so one left without a word is rescued below and a
  // leaf is not. Empty is a locale that names no shape of its own, which rescues nothing.
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

  // The rescue, run once the walk is done rather than as an order over it. A shape left with no word
  // takes one back from a character holding it that has another gloss free, and only that one key
  // moves: serving the shapes first instead would reorder the whole curriculum to settle a handful.
  const left: string[] = []

  for (const character of unsettled) {
    if (!naming.has(character)) {
      left.push(character)
      continue
    }

    const taking = rescued(character, keys, glossesOf, taken)
    if (taking === null) left.push(character)
  }

  return { keys, unsettled: left }
}

// The first gloss of this character whose holder can step sideways, applied to both of them. Nothing
// where no holder can move, which leaves the character reported rather than another one displaced.
function rescued(
  character: string,
  keys: Record<string, string>,
  glossesOf: (character: string) => readonly string[],
  taken: Set<string>,
): string | null {
  for (const wanted of glossesOf(character)) {
    const holder = Object.keys(keys).find((one) => keys[one]?.toLowerCase() === wanted.toLowerCase())
    if (holder === undefined) continue

    const moved = glossesOf(holder).find((one) => !taken.has(one.toLowerCase()))
    if (moved === undefined) continue

    keys[holder] = moved
    keys[character] = wanted
    taken.add(moved.toLowerCase())

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
