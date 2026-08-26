import { toRomaji } from 'wanakana'

// The Japanese half of a sound anchor: what a reading is made of, counted the way Japanese counts and
// written the way a comparison can use.
//
// Everything that decides whether an anchor holds runs on these rather than on kana or on romaji: a
// check that compares spellings answers a question nobody asked, and the French side has its own
// pronunciation derived from a lexicon for the same reason.
//
// The kana are turned into Hepburn by `wanakana`, which the answer field also depends on for the
// other direction, per ADR 0007. One package for both, rather than a romanisation of our own.

// A small kana is not a mora. It rides on the one before it, and a count that gives it one of its own
// turns ちょう into three, which is the length that separates two different words.
const RIDES_ALONG = 'ゃゅょぁぃぅぇぉャュョァィゥェォ'
const PAUSE = 'っッ'
const NASAL = 'んン'
const LENGTH = 'ー'
const VOWELS = 'aiueo'
// The two う can hold. After a, i or e it is a vowel of its own.
const LENGTHENED = 'ou'

export function moraeOf(kana: string): readonly string[] {
  const morae: string[] = []

  for (const character of kana) {
    const previous = morae.at(-1)

    if (previous !== undefined && RIDES_ALONG.includes(character)) morae[morae.length - 1] = previous + character
    else morae.push(character)
  }

  return morae
}

export function phonemesOf(kana: string): readonly string[] {
  const morae = moraeOf(kana)
  const phonemes: string[] = []

  morae.forEach((mora, index) => {
    // A held consonant rather than a repeated one, so it borrows the sound that follows it. At the
    // end of a reading it holds nothing, and holding nothing is silence.
    if (PAUSE.includes(mora)) {
      const next = morae[index + 1]
      const held = next === undefined ? undefined : soundsOf(next)[0]

      if (held !== undefined) phonemes.push(held)
      return
    }

    if (NASAL.includes(mora)) {
      phonemes.push('n')
      return
    }

    const last = phonemes.at(-1)
    const lengthens = last !== undefined && VOWELS.includes(last)

    // Length is contrastive, so it is written as the vowel twice rather than as a mark: こう is not
    // こ, and an anchor that matches one does not match the other. Only after o and u, because あう
    // and かう are two vowels rather than one held: 買う is ka-u, and reading it as a long a scores
    // every anchor against a word nobody says.
    if (lengthens && (mora === LENGTH || (isLengthening(mora) && LENGTHENED.includes(last)))) {
      phonemes.push(last)
      return
    }

    // A mark with no vowel before it lengthens nothing. Carried as it is rather than invented into a
    // sound, so it reaches a check that can name it.
    if (mora === LENGTH) {
      phonemes.push(mora)
      return
    }

    phonemes.push(...soundsOf(mora))
  })

  return phonemes
}

// う after o or u writes the length of that vowel rather than a vowel of its own, which is how every
// on'yomi ending in a long o is spelled.
function isLengthening(mora: string): boolean {
  return mora === 'う' || mora === 'ウ'
}

// Hepburn onsets to the sounds they stand for. The three that matter most are here for a reason:
// French has no /h/, no /ts/ and no /ɸ/, so a French anchor claiming one of them is claiming a sound
// its own language cannot make.
const ONSETS: Record<string, readonly string[]> = {
  '': [],
  k: ['k'],
  g: ['g'],
  s: ['s'],
  sh: ['ɕ'],
  z: ['z'],
  j: ['dʑ'],
  t: ['t'],
  ch: ['tɕ'],
  ts: ['ts'],
  d: ['d'],
  n: ['n'],
  h: ['h'],
  f: ['ɸ'],
  b: ['b'],
  p: ['p'],
  m: ['m'],
  y: ['j'],
  r: ['ɾ'],
  w: ['w'],
  ky: ['k', 'j'],
  gy: ['g', 'j'],
  ny: ['n', 'j'],
  hy: ['h', 'j'],
  by: ['b', 'j'],
  py: ['p', 'j'],
  my: ['m', 'j'],
  ry: ['ɾ', 'j'],
}

function soundsOf(mora: string): readonly string[] {
  const romaji = toRomaji(mora)
  const vowel = romaji.at(-1) ?? ''
  const onset = ONSETS[romaji.slice(0, -1)]

  // A mora the converter does not know is carried as it is rather than dropped, so it reaches a check
  // that can name it instead of disappearing into a comparison that then passes.
  if (onset === undefined || !VOWELS.includes(vowel)) return [romaji]

  return [...onset, vowel]
}

// Katakana read as the hiragana a reading is written in. A word carries the two scripts and its reading
// is stated in one, so a comparison that does not fold them refuses every borrowed word.
//
// Written here rather than taken from `toHiragana`, which also reads the long mark as the vowel it
// lengthens and turns コーヒー into こうひい: what a curriculum states is コーヒー, and a fold that
// rewrites it compares a reading against a reading nobody teaches.
export function hiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6]/g, (kana) => String.fromCodePoint((kana.codePointAt(0) as number) - 0x60))
}
