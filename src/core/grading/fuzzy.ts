import type { GradedAnswer } from './judge-port'
import { normalise } from './normalise.ts'

// Latin combining marks alone. Kana carry their dakuten a block higher, so a fold written for French
// cannot quietly turn が into か on a tier that is never handed a reading.
const LATIN_MARKS = /[̀-ͯ]/gu

// What French opens a meaning on while carrying none of it. The reflexive pronoun is here for the
// same reason as the articles: a reader recalls the verb and not the word standing in front of it.
// Ordered so the longer opener is tried first, an alternation taking the first branch that matches.
const OPENER = /^(?:de la |des |du |de |les |le |la |un |une |à |se |l'|d'|s')/u

// Below this, one letter apart is a different word rather than a slip: dix and six, deux and doux,
// fort and mort. A shorter reference is answered exactly or it is not answered.
export const SHORTEST_TYPO = 5

// What this tier compares on: the exact tier's folding, and then the accents, because a French
// keyboard is what the reader may not have and the accent is never what is being tested.
function fold(value: string): string {
  return normalise(value).normalize('NFD').replace(LATIN_MARKS, '').normalize('NFC')
}

// What one answer is compared as, on both sides and in the artifact the guard is built from: the exact
// tier's folding, then the accents, then the opener. A word compared one way here and another way where
// the guard is written is a guard that holds nothing.
export function answerKey(value: string): string {
  return fold(value).replace(OPENER, '')
}

// One edit or none: a letter replaced, inserted or dropped. Written here rather than taken from the
// anchor table's distance, which weighs a substitution by how far two sounds sit apart and divides by
// the longer word. That measures whether a cue can be heard in a reading, which is not this question.
export function oneEditApart(typed: string, reference: string): boolean {
  if (Math.abs(typed.length - reference.length) > 1) return false

  let left = 0
  let right = 0
  let edits = 0

  while (left < typed.length && right < reference.length) {
    if (typed[left] === reference[right]) {
      left += 1
      right += 1
      continue
    }

    edits += 1
    if (edits > 1) return false

    if (typed.length === reference.length) {
      left += 1
      right += 1
    } else if (typed.length > reference.length) {
      left += 1
    } else {
      right += 1
    }
  }

  return edits + (typed.length - left) + (reference.length - right) <= 1
}

// Tier 2, meanings only, and what the reader is owed once the exact tier has missed: the answer they
// knew, typed the way people type. Nothing here is allowed to make a wrong answer right, which is
// what `claimed` holds the line on. It carries every word this locale answers some card with, so a
// near miss landing exactly on another card's answer is refused rather than graded: the exact tier has
// already tried every reference this item allows, so a typed word the course still teaches belongs to
// a different item and accepting it would teach that mix-up rather than catch it.
//
// Refusing is not failing. The cascade turns a refusal into a question for the reader.
export function fuzzyVerdict(
  { answer, accepted, refused }: GradedAnswer,
  claimed: ReadonlySet<string>,
): 'correct' | null {
  const typed = answerKey(answer)
  if (typed === '') return null
  if (refused.some((word) => answerKey(word) === typed)) return null

  const targets = accepted.map(answerKey)

  // The item's own answer first, and the guard cannot reach it: an accent the reader did not type and
  // an article they did are this word written two ways, not a second word. docs/specs/v0.1.md asks for
  // exactly this, an unaccented tache accepted where the item allows it and nowhere else.
  if (targets.includes(typed)) return 'correct'

  // Only now, where a letter differs and the answer could be another card's word.
  if (claimed.has(typed)) return null

  return targets.some((target) => target.length >= SHORTEST_TYPO && oneEditApart(typed, target))
    ? 'correct'
    : null
}
