// Whether a French word can stand for a Japanese reading, judged on sounds rather than on spelling.
//
// The anchor's own pronunciation is derived from a French lexicon before it reaches here, never taken
// from what a model claimed it to be: the gap between the two is a hallucinated pronunciation, and it
// is the cheapest one in the whole pipeline to catch.

// Three features for a consonant and four for a vowel, which is enough to say how far apart two
// sounds are without pretending to a precision nothing downstream uses. What matters is that a
// difference of one feature reads as a near miss and a difference of all of them does not.
type Sound = {
  readonly vowel: boolean
  readonly features: readonly string[]
}

const CONSONANTS: Record<string, readonly string[]> = {
  p: ['bilabial', 'stop', 'voiceless'],
  b: ['bilabial', 'stop', 'voiced'],
  t: ['alveolar', 'stop', 'voiceless'],
  d: ['alveolar', 'stop', 'voiced'],
  k: ['velar', 'stop', 'voiceless'],
  g: ['velar', 'stop', 'voiced'],
  m: ['bilabial', 'nasal', 'voiced'],
  n: ['alveolar', 'nasal', 'voiced'],
  ɲ: ['palatal', 'nasal', 'voiced'],
  f: ['labiodental', 'fricative', 'voiceless'],
  v: ['labiodental', 'fricative', 'voiced'],
  s: ['alveolar', 'fricative', 'voiceless'],
  z: ['alveolar', 'fricative', 'voiced'],
  ʃ: ['postalveolar', 'fricative', 'voiceless'],
  ʒ: ['postalveolar', 'fricative', 'voiced'],
  ɕ: ['palatal', 'fricative', 'voiceless'],
  ɸ: ['bilabial', 'fricative', 'voiceless'],
  h: ['glottal', 'fricative', 'voiceless'],
  ʁ: ['uvular', 'fricative', 'voiced'],
  ɾ: ['alveolar', 'tap', 'voiced'],
  l: ['alveolar', 'lateral', 'voiced'],
  ts: ['alveolar', 'affricate', 'voiceless'],
  tɕ: ['palatal', 'affricate', 'voiceless'],
  dʑ: ['palatal', 'affricate', 'voiced'],
  j: ['palatal', 'glide', 'voiced'],
  w: ['labiovelar', 'glide', 'voiced'],
  ɥ: ['palatal', 'glide', 'voiced'],
}

const VOWELS: Record<string, readonly string[]> = {
  i: ['close', 'front', 'unrounded', 'oral'],
  y: ['close', 'front', 'rounded', 'oral'],
  u: ['close', 'back', 'rounded', 'oral'],
  e: ['mid', 'front', 'unrounded', 'oral'],
  ø: ['mid', 'front', 'rounded', 'oral'],
  ə: ['mid', 'central', 'rounded', 'oral'],
  o: ['mid', 'back', 'rounded', 'oral'],
  ɛ: ['open-mid', 'front', 'unrounded', 'oral'],
  œ: ['open-mid', 'front', 'rounded', 'oral'],
  ɔ: ['open-mid', 'back', 'rounded', 'oral'],
  a: ['open', 'central', 'unrounded', 'oral'],
  ɑ: ['open', 'back', 'unrounded', 'oral'],
  'ɛ̃': ['open-mid', 'front', 'unrounded', 'nasal'],
  'œ̃': ['open-mid', 'front', 'rounded', 'nasal'],
  'ɔ̃': ['open-mid', 'back', 'rounded', 'nasal'],
  'ɑ̃': ['open', 'back', 'unrounded', 'nasal'],
}

// One feature apart, on either scale. Wider and voicing alone would separate two anchors that a
// learner hears as the same; narrower and no anchor in the language would ever qualify.
const NEAR = 1 / 3

export function agreesAtTheStart(reading: readonly string[], anchor: readonly string[]): boolean {
  const [readingOnset] = reading
  const [anchorOnset] = anchor

  if (readingOnset === undefined || anchorOnset === undefined) return false
  // Exact on the consonant, because the first sound is what the reader reaches for, and tolerant on
  // the vowel, because French draws its vowels finer than Japanese does.
  if (readingOnset !== anchorOnset) return false

  const readingVowel = reading.find(isVowel)
  const anchorVowel = anchor.find(isVowel)

  if (readingVowel === undefined || anchorVowel === undefined) return false

  return between(readingVowel, anchorVowel) <= NEAR
}

// What a language cannot begin a word with is a fact about that language, so it arrives from the
// locale's own material rather than from here: this file knows how sounds compare, not which ones
// French happens to lack. An anchor claiming a sound its language does not make is the failure that
// catches everyone, hôtel being said without any h at all, so the match exists only on paper.
export function impossibleOnset(
  reading: readonly string[],
  anchor: readonly string[],
  cannotStart: readonly string[],
): string | null {
  const [onset] = reading

  if (onset === undefined || !cannotStart.includes(onset)) return null

  return anchor[0] === onset ? null : onset
}

// Edit distance over sounds, where replacing one sound by another costs what they differ by rather
// than a flat one. A sound present on one side only costs a whole one, which is what makes a lost
// mora expensive: length is contrastive in Japanese and French cannot write it.
export function distanceBetween(reading: readonly string[], anchor: readonly string[]): number {
  const longest = Math.max(reading.length, anchor.length)
  if (longest === 0) return 0

  let previous = anchor.map((_, index) => index)

  for (const [row, left] of reading.entries()) {
    const current = [row + 1]

    for (const [column, right] of anchor.entries()) {
      current.push(
        Math.min(
          (previous[column] ?? 0) + between(left, right),
          (previous[column + 1] ?? 0) + 1,
          (current[column] ?? 0) + 1,
        ),
      )
    }

    previous = current
  }

  return (previous.at(-1) ?? longest) / longest
}

function isVowel(sound: string): boolean {
  return VOWELS[sound] !== undefined
}

function soundOf(sound: string): Sound | undefined {
  const vowel = VOWELS[sound]
  if (vowel !== undefined) return { vowel: true, features: vowel }

  const consonant = CONSONANTS[sound]

  return consonant === undefined ? undefined : { vowel: false, features: consonant }
}

// A sound the tables do not carry is as far from everything as it can be, rather than quietly equal
// to it: an unknown symbol reaching a comparison that passes is worse than one that fails.
function between(left: string, right: string): number {
  if (left === right) return 0

  const first = soundOf(left)
  const second = soundOf(right)

  if (first === undefined || second === undefined || first.vowel !== second.vowel) return 1

  const differing = first.features.filter((feature, index) => feature !== second.features[index])

  return differing.length / first.features.length
}
