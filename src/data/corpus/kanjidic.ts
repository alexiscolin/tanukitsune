// KANJIDIC2 states each character with its readings and its meanings, one element per gloss, the
// language on an attribute and English implied by its absence. The glosses of one language are the
// whole of what the corpus takes from it: grades, stroke counts and readings are read from elsewhere.
//
// Read with expressions rather than through a parser dependency, for the reason kanjivg.ts states: one
// machine-generated file at a pinned release, and the shape taken from it is two fields deep. The
// licence and the attribution it obliges are in docs/sources.md.

import { hiragana } from '../../core/corpus/phonetics.ts'

const ENTRY = /<character>([\s\S]*?)<\/character>/g
const LITERAL = /<literal>(.*?)<\/literal>/
// The release states the Kangxi listing among the meanings, "radical hameçon (no. 5)", which says what
// the character is in a table rather than what it means. Twenty characters carry one, and it is never
// a word a reader can be graded on.
const LISTING = /\(no\.\s*\d+\)/

// The release quotes a gloss that quotes itself, and an aside taken out of the middle of one leaves
// the quotes around what is left. A key is a word rather than punctuation. Only the double quote: the
// apostrophe is a letter's neighbour in French, and stripping it turns s'appeler into sappeler.
const QUOTES = /"/g

// A parenthesis qualifies a gloss for somebody reading a dictionary and means nothing on a card, where
// the word is the whole of what a learner types: a release states "sushi (plat)" and a reader types
// sushi. Read by jmdict.ts too, the two releases stating their asides the same way.
export function withoutAside(gloss: string): string {
  return gloss.replace(/\s*\([^)]*\)/g, '')
}

// What the release says it is. The address it is served from is one rolling file rather than a
// versioned one, so a run that recorded the URL would record nothing: two runs six months apart read
// different data under the same name. The file states its own version, and that is what is written
// beside what a run produced.
export function releaseOf(xml: string): string {
  const version = /<database_version>(.*?)<\/database_version>/.exec(xml)?.[1]
  const created = /<date_of_creation>(.*?)<\/date_of_creation>/.exec(xml)?.[1]

  if (version === undefined || created === undefined) return 'unstated'

  return `${version}, created ${created}`
}

// The three the curriculum tells apart. A reading of one type standing for another teaches a sound the
// character does not carry there, which is the failure the check against this release exists to catch.
export type Reading = {
  readonly value: string
  readonly type: 'onyomi' | 'kunyomi' | 'nanori'
}

const ON = /<reading r_type="ja_on">(.*?)<\/reading>/g
const KUN = /<reading r_type="ja_kun">(.*?)<\/reading>/g
const NANORI = /<nanori>(.*?)<\/nanori>/g

export function parseGlosses(xml: string, locale: string): ReadonlyMap<string, readonly string[]> {
  const glossed = new Map<string, readonly string[]>()
  // English carries no attribute at all, the release implying it by its absence, so it is the one
  // language that cannot be asked for by name. It is what corpus:key-translation reads, a character the
  // release does not gloss in the locale being carried across from the English it does state.
  const spoken =
    locale === 'en' ? /<meaning>(.*?)<\/meaning>/g : new RegExp(`<meaning m_lang="${locale}">(.*?)</meaning>`, 'g')

  for (const [, body = ''] of xml.matchAll(ENTRY)) {
    const character = LITERAL.exec(body)?.[1]
    if (character === undefined) continue

    glossed.set(
      character,
      [...body.matchAll(spoken)]
        .map(([, gloss = '']) => gloss)
        .filter((gloss) => !LISTING.test(gloss))
        .map((gloss) => plain(gloss))
        // Two glosses telling themselves apart only by their asides are one word once the asides are
        // gone, and a list holding a word twice is a list no order over it can satisfy, which would
        // leave the character asked for forever.
        .filter((gloss, at, all) => isWord(gloss) && all.indexOf(gloss) === at),
    )
  }

  return glossed
}

// A gloss carrying no letter in any script is a numeral or a mark rather than a word: the release
// states 10000 among the meanings of 万, which is what the character counts and not what a reader
// types. Language-neutral, since every language this reads writes its words in letters.
function isWord(gloss: string): boolean {
  return /\p{L}/u.test(gloss)
}

function plain(gloss: string): string {
  return withoutAside(gloss).replace(QUOTES, '').replace(/\s+/g, ' ').trim()
}

// The Japanese readings the release states for a character, named the way a curriculum names them so
// the two can be compared without a translation at every call site. On'yomi are written in katakana
// here and in hiragana there, a kun marks its okurigana with a dot and a suffix reading with a leading
// hyphen, and a nanori sits outside the group the others share.
//
// A kun is carried twice, once whole and once without its okurigana, because a curriculum teaches
// either and neither form can be derived from the other after the mark is gone.
export function parseReadings(xml: string): ReadonlyMap<string, readonly Reading[]> {
  const said = new Map<string, readonly Reading[]>()

  for (const [, body = ''] of xml.matchAll(ENTRY)) {
    const character = LITERAL.exec(body)?.[1]
    if (character === undefined) continue

    const readings: Reading[] = []
    for (const [, value = ''] of body.matchAll(ON)) readings.push({ value: hiragana(value), type: 'onyomi' })

    for (const [, written = ''] of body.matchAll(KUN)) {
      const value = written.replace(/^-|-$/g, '')
      readings.push({ value: value.replace('.', ''), type: 'kunyomi' })

      const [stem = ''] = value.split('.')
      if (stem !== value.replace('.', '')) readings.push({ value: stem, type: 'kunyomi' })
    }

    for (const [, value = ''] of body.matchAll(NANORI)) readings.push({ value, type: 'nanori' })

    said.set(character, readings)
  }

  return said
}
