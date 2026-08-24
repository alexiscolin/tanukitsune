// The extension on the value import is there for the reason inventory.ts states: the corpus commands
// run this file through Node rather than a bundler, where an extensionless specifier resolves to
// nothing.
import { unreadable } from './name.ts'
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
  return unreadable(word, shape, ' ')
}

export type Keyed = {
  readonly keys: Readonly<Record<string, string>>
  readonly unsettled: readonly string[]
  // Who a rescue moved off the word the walk had given them, and where to. A rescue settles one
  // character by unsettling another's first choice, and the second is the one nobody would otherwise
  // see: it leaves the run with a word still, so no count changes and no report would name it.
  readonly moved: readonly { readonly character: string; readonly from: string; readonly to: string }[]
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
  // Who holds each word, folded, because two keys differing only in case are one key to a reader and to
  // a grader. It answers both questions the walk and the rescue ask, whether a word is free and who has
  // it, so there is one thing to keep true rather than a set and a map to keep in step.
  const holders = new Map<string, string>()

  for (const character of characters) {
    const free = glossesOf(character).find((gloss) => !holders.has(gloss.toLowerCase()))

    if (free === undefined) {
      unsettled.push(character)
      continue
    }

    keys[character] = free
    holders.set(free.toLowerCase(), character)
  }

  // The rescue, run once the walk is done rather than as an order over it. A character left with no
  // word takes one back from a holder that has another gloss free, and only that one key moves:
  // serving everybody in this order from the start would reorder the whole curriculum instead.
  //
  // The shapes stories name go first, since a rescue can only move a holder that has somewhere to go
  // and whoever is asked first has the most room. Nobody is left out: a card nobody can be graded on is
  // worse than a card on its second choice.
  const moved: { character: string; from: string; to: string }[] = []
  const left: string[] = []
  const first = unsettled.filter((one) => naming.has(one))

  for (const character of [...first, ...unsettled.filter((one) => !naming.has(one))]) {
    if (!rescued(character, { keys, holders, moved }, glossesOf)) left.push(character)
  }

  return { keys, unsettled: left, moved }
}

// What the walk settled, and who holds what, together because a rescue moves all three at once.
type Board = {
  readonly keys: Record<string, string>
  // Word to character, folded. Searching `keys` for a word instead would cost a scan of every key per
  // gloss per character, which is the square of the curriculum and the cost composedBy exists not to pay.
  readonly holders: Map<string, string>
  readonly moved: { character: string; from: string; to: string }[]
}

// Takes the first gloss of this character whose holder can step sideways, applying the move to both of
// them and writing it down. False where no holder can move, which leaves the character reported rather
// than another one displaced.
function rescued(
  character: string,
  { keys, holders, moved }: Board,
  glossesOf: (character: string) => readonly string[],
): boolean {
  for (const wanted of glossesOf(character)) {
    const holder = holders.get(wanted.toLowerCase())
    if (holder === undefined) continue

    const free = glossesOf(holder).find((one) => !holders.has(one.toLowerCase()))
    if (free === undefined) continue

    keys[holder] = free
    keys[character] = wanted
    holders.set(free.toLowerCase(), holder)
    holders.set(wanted.toLowerCase(), character)
    moved.push({ character: holder, from: wanted, to: free })

    return true
  }

  return false
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
