// Whether an anchor a model wrote may stand for a reading, judged on the rules the table applies to
// the anchors it chooses itself. A proposal widens the search and never the rules.
//
// It lives here, and not inside the command that asks, for the reason `faultInKey` and `faultInName`
// do: a rule the asker states in prose and the collector applies in code drifts, and a drift nothing
// can reach is a drift found by paying for a batch.
//
// Nothing here reads a lexicon. What each word of the phrase is, and what it sounds like, arrive
// already looked up: this knows what to do about them.

import { agreesAtTheStart, distanceBetween } from './anchor.ts'

export type Held = {
  readonly anchor: string
  readonly phonemes: readonly string[]
}

// One word of the proposal, as the locale's own lexicon states it.
type Said = {
  readonly category: string
  readonly frequency: number
}

export type Answer = {
  readonly proposal: string
  // What the lexicon says the whole phrase sounds like, or nothing where it holds one of its words
  // nowhere: a pronunciation taken on trust is the one failure this layer exists to refuse.
  readonly heard: readonly string[] | null
  readonly words: readonly Said[]
  // The sounds the reading is measured on, which are not always what its kana say: a locale hears some
  // of them as others and writes one it does not say.
  readonly said: readonly string[]
  // The letter the anchor must carry, where the reading opens on a sound the locale writes without
  // saying it. Empty where it opens on one the locale says.
  readonly spelledWith: string
  // How common the word this would replace is, where the reading has one. A proposal rarer than the
  // word it was paid to replace is a request paid for to go backwards.
  readonly replacing: number | null
}

export type Bounds = {
  // How far a word may sit from the reading and still be heard in it.
  readonly nearest: number
  // How far two anchors must sit from each other, which is what stops one cue answering twice.
  readonly apart: number
  // A cue longer than this is a sentence, and a reader recalls a thing rather than a sentence.
  readonly atMostWords: number
  // What a story is built on, which is the locale's to say.
  readonly partsOfSpeech: readonly string[]
}

// What no card will carry, whatever the word sounds like: a word the locale refuses, and a word of one
// letter, which is the letter itself and a thing a reader spells rather than pictures. A phrase is read
// word by word, since a phrase carrying one such word carries it whole.
//
// The refusal is held to the forms this locale writes a word in, the way a name is: read on the lemma
// alone, every entry walks back in as its plural or its feminine, which is the same word on the card.
export function faultInAnchorWords(
  text: string,
  refuses: ReadonlySet<string>,
  telling: { readonly inflects: readonly string[]; readonly letters: string },
): string | null {
  for (const word of text.split(/\s+/)) {
    if (word.replace(/[^\p{L}]/gu, '').length <= 1) {
      return `"${word}" is one letter, which a reader spells rather than pictures`
    }
  }

  // Cut on anything the locale does not write words with rather than on spaces alone. A refused word
  // reaches a card behind a hyphen, an apostrophe or a capital exactly as it does behind a space:
  // cul-terreux carries cul, l'attardé carries attardé, and la Bite is the same word said louder.
  const letters = new Set(telling.letters)

  for (const word of [...text.toLowerCase()].map((one) => (letters.has(one) ? one : ' ')).join('').split(/\s+/)) {
    if (word === '') continue

    const lemma = telling.inflects.find((one) => word.endsWith(one) && refuses.has(word.slice(0, -one.length)))

    if (refuses.has(word) || lemma !== undefined) return `"${word}" is a word the locale refuses`
  }

  return null
}

export function faultInAnchor(answer: Answer, held: readonly Held[], bounds: Bounds): string | null {
  const { proposal, heard, words, said, spelledWith, replacing } = answer

  const written = proposal.trim()
  if (written === '') return 'no word at all'
  if (heard === null) return 'the lexicon holds no such word'

  const said_ = written.split(/\s+/)
  if (said_.length > bounds.atMostWords) return 'more words than a cue carries'
  if (words.some((word) => !bounds.partsOfSpeech.includes(word.category))) {
    return `${bounds.partsOfSpeech.join(' or ')} is what a story is built on`
  }

  if (spelledWith !== '' && !written.startsWith(spelledWith)) {
    return `this reading opens on a sound written ${spelledWith} and said by nobody`
  }

  // The whole anchor, not the words inside it: an anchor is the thing the reader meets, so haut nid is
  // not nid, and what keeps two of them from being one cue is the separation below.
  if (held.some((one) => one.anchor === written)) return 'already stands for another reading'
  if (!agreesAtTheStart(said, heard)) return 'does not begin on the sound the reading does'

  const far = distanceBetween(said, heard)
  if (far > bounds.nearest) return `${far.toFixed(2)} away, past ${bounds.nearest}`

  const near = held.find((one) => distanceBetween(one.phonemes, heard) < bounds.apart)
  if (near !== undefined) return `sits nearer than ${bounds.apart} to ${near.anchor}`

  const common = Math.min(...words.map((word) => word.frequency))
  if (replacing !== null && common < replacing) return `rarer than the ${replacing} of the word it replaces`

  return null
}
