<<<<<<< HEAD
// Whether an anchor a model wrote may stand for a reading, judged on the rules the table applies to
// the anchors it chooses itself. A proposal widens the search and never the rules.
//
// It lives here, and not inside the command that asks, for the reason `faultInKey` and `faultInName`
// do: a rule the asker states in prose and the collector applies in code drifts, and a drift nothing
// can reach is a drift found by paying for a batch.
//
// Nothing here reads a lexicon. What each word of the phrase is, and what it sounds like, arrive
// already looked up: this knows what to do about them.
=======
// Whether an anchor a model wrote may stand for a reading, judged on the same rules the table applies
// to the anchors it chooses itself. A proposal widens the search and never the rules.
//
// It lives here, and not inside the command that asks, for the reason `faultInKey` and `faultInName`
// do: a rule the asker states in prose and the collector applies in code drifts, and a drift nothing
// can reach is a drift found by paying for a batch. Every case its test carries is an answer a batch
// brought back.
//
// The sounds are derived elsewhere, from the locale's own lexicon, and arrive here already found or
// already missing. Nothing here knows what a word sounds like; it knows what to do about it.
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)

import { agreesAtTheStart, distanceBetween } from './anchor.ts'

export type Held = {
  readonly anchor: string
  readonly phonemes: readonly string[]
}

<<<<<<< HEAD
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
=======
export type Answer = {
  readonly proposal: string
  // What the lexicon says the proposal sounds like, or nothing where it holds no such word: a
  // pronunciation taken on trust is the one failure this layer exists to refuse.
  readonly heard: readonly string[] | null
  // The sounds the reading is measured on, which are not always what its kana say: a locale hears some
  // of them as others and writes one it does not say.
  readonly said: readonly string[]
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
}

export type Bounds = {
  // How far a word may sit from the reading and still be heard in it.
  readonly nearest: number
  // How far two anchors must sit from each other, which is what stops one cue answering twice.
  readonly apart: number
  // A cue longer than this is a sentence, and a reader recalls a thing rather than a sentence.
<<<<<<< HEAD
  readonly atMostWords: number
  // What a story is built on, which is the locale's to say.
  readonly partsOfSpeech: readonly string[]
}

export function faultInAnchor(answer: Answer, held: readonly Held[], bounds: Bounds): string | null {
  const { proposal, heard, words, said, spelledWith, replacing } = answer
=======
  readonly mostWords: number
}

export function faultInAnchor(answer: Answer, held: readonly Held[], bounds: Bounds): string | null {
  const { proposal, heard, said } = answer
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)

  const written = proposal.trim()
  if (written === '') return 'no word at all'
  if (heard === null) return 'the lexicon holds no such word'
<<<<<<< HEAD

  const said_ = written.split(/\s+/)
  if (said_.length > bounds.atMostWords) return 'more words than a cue carries'
  if (words.some((word) => !bounds.partsOfSpeech.includes(word.category))) {
    return `${bounds.partsOfSpeech.join(' or ')} is what a story is built on`
  }

  if (spelledWith !== '' && !written.startsWith(spelledWith)) {
    return `this reading opens on a sound written ${spelledWith} and said by nobody`
  }
=======
  if (written.split(/\s+/).length > bounds.mostWords) return 'more words than a cue carries'
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)

  // The whole anchor, not the words inside it: an anchor is the thing the reader meets, so haut nid is
  // not nid, and what keeps two of them from being one cue is the separation below.
  if (held.some((one) => one.anchor === written)) return 'already stands for another reading'
<<<<<<< HEAD
=======

>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
  if (!agreesAtTheStart(said, heard)) return 'does not begin on the sound the reading does'

  const far = distanceBetween(said, heard)
  if (far > bounds.nearest) return `${far.toFixed(2)} away, past ${bounds.nearest}`

  const near = held.find((one) => distanceBetween(one.phonemes, heard) < bounds.apart)
  if (near !== undefined) return `sits nearer than ${bounds.apart} to ${near.anchor}`

<<<<<<< HEAD
  const common = Math.min(...words.map((word) => word.frequency))
  if (replacing !== null && common < replacing) return `rarer than the ${replacing} of the word it replaces`

=======
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
  return null
}
