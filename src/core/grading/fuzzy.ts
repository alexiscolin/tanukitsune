import type { GradedAnswer } from './judge-port'
import { normalise } from './normalise.ts'

// Latin combining marks alone. Kana carry their dakuten a block higher, so a fold written for French
// cannot quietly turn が into か on a tier that is never handed a reading.
const LATIN_MARKS = /[̀-ͯ]/gu

// The words French opens a meaning on while carrying none of it: the definite article, and the
// reflexive pronoun, since a reader recalls the verb and not the word standing in front of it. Nothing
// that counts or relates, because une fois is not fois and dû à is not à.
const ARTICLE = /^(?:les |le |la |l')/u
const PRONOUN = /^(?:se |s')/u

// Letters French writes two ways that no Unicode normalisation merges: the ligatures, and the curly
// apostrophe a phone or a pasted text puts where a keyboard puts a straight one.
const SPELLINGS: readonly (readonly [RegExp, string])[] = [
  [/œ/gu, 'oe'],
  [/æ/gu, 'ae'],
  [/[‘’]/gu, "'"],
]

// Below this, one letter apart is a different word rather than a slip: dix and six, deux and doux,
// fort and mort. Measured on the word that slipped, not the phrase around it.
const SHORTEST_TYPO = 5

function spelled(value: string): string {
  return SPELLINGS.reduce((text, [from, to]) => text.replace(from, to), normalise(value))
}

function withoutAccents(value: string): string {
  return value.normalize('NFD').replace(LATIN_MARKS, '').normalize('NFC')
}

// The answer as written, less what French opens it on. Two answers equal here are one word written
// twice, whatever their case, ligature or article.
function asWritten(value: string): string {
  return spelled(value).replace(ARTICLE, '').replace(PRONOUN, '')
}

// What one answer is compared as, on both sides and in the artifact the guard is built from: as written,
// and then without its accents, because a French keyboard is what the reader may not have. A word
// compared one way here and another way where the guard is written is a guard that holds nothing.
export function answerKey(value: string): string {
  return withoutAccents(asWritten(value))
}

// The same, keeping the reflexive pronoun: what tells two cards apart when one teaches the verb and the
// other the verb done to oneself, which the grader forgives and the corpus must not merge.
export function wordKey(value: string): string {
  return withoutAccents(spelled(value).replace(ARTICLE, ''))
}

// One edit or none: a letter replaced, inserted or dropped. Written here rather than taken from the
// anchor table's distance, which weighs a substitution by how far two sounds sit apart and divides by
// the longer word. That measures whether a cue can be heard in a reading, which is not this question.
function oneEditApart(typed: string, reference: string): boolean {
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

// A slip of one letter onto a word the course answers with. Only such a word: the source's English and
// the reader's own words have no neighbours anybody collected, so a slip on one could land on anything
// and they are matched as written. The letter must fall inside a word long enough to be slipped on, and
// no other answer may sit as near the slip, since a slip halfway between two answers is a guess.
function slipsOnto(typed: string, target: string, claimed: ReadonlySet<string>): boolean {
  if (!claimed.has(target) || !oneEditApart(typed, target)) return false

  const said = typed.split(' ')
  const meant = target.split(' ')
  if (said.length !== meant.length) return false

  const at = meant.findIndex((word, index) => word !== said[index])
  const slip = said[at] ?? ''
  const word = meant[at] ?? ''
  if (word.length < SHORTEST_TYPO) return false

  for (const other of claimed) {
    if (other !== word && oneEditApart(slip, other)) return false
  }

  return true
}

// Tier 2, meanings only, and what the reader is owed once the exact tier has missed: the answer they
// knew, typed the way people type. Nothing here is allowed to make a wrong answer right, which is what
// `claimed` holds the line on: every word this locale answers some card with.
//
// Refusing is not failing. The cascade turns a refusal into a question for the reader.
export function placesNearMiss({ answer, accepted, refused }: GradedAnswer, claimed: ReadonlySet<string>): boolean {
  const typed = answerKey(answer)
  if (typed === '') return false
  if (refused.some((word) => answerKey(word) === typed)) return false

  // The item's own answer written another way, which the guard cannot reach. An article or a ligature
  // is always forgiven. An accent only when the reader typed none: left out is a keyboard, put in is a
  // spelling, and élève is not élevé. docs/specs/v0.1.md asks for an unaccented tache accepted where
  // the item allows it and nowhere else.
  const written = asWritten(answer)
  if (accepted.some((reference) => asWritten(reference) === written)) return true
  if (written === typed && accepted.some((reference) => answerKey(reference) === typed)) return true

  // Only now, where a letter differs and the answer could be another card's word.
  if (claimed.has(typed)) return false

  return accepted.some((reference) => slipsOnto(typed, answerKey(reference), claimed))
}
