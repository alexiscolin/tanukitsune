// KANJIDIC2 states each character with its readings and its meanings, one element per gloss, the
// language on an attribute and English implied by its absence. The glosses of one language are the
// whole of what the corpus takes from it: grades, stroke counts and readings are read from elsewhere.
//
// Read with expressions rather than through a parser dependency, for the reason kanjivg.ts states: one
// machine-generated file at a pinned release, and the shape taken from it is two fields deep. The
// licence and the attribution it obliges are in docs/sources.md.

const ENTRY = /<character>([\s\S]*?)<\/character>/g
const LITERAL = /<literal>(.*?)<\/literal>/
// The release states the Kangxi listing among the meanings, "radical hameçon (no. 5)", which says what
// the character is in a table rather than what it means. Twenty characters carry one, and it is never
// a word a reader can be graded on.
const LISTING = /\(no\.\s*\d+\)/
// A parenthesis qualifies a gloss for somebody reading a dictionary and means nothing on a card, where
// the key is the whole of what a learner types. The word it qualifies is kept and the aside is not.
const ASIDE = /\s*\([^)]*\)/g
// The release quotes a gloss that quotes itself, and an aside taken out of the middle of one leaves
// the quotes around what is left. A key is a word rather than punctuation. Only the double quote: the
// apostrophe is a letter's neighbour in French, and stripping it turns s'appeler into sappeler.
const QUOTES = /"/g

export function parseGlosses(xml: string, locale: string): ReadonlyMap<string, readonly string[]> {
  const glossed = new Map<string, readonly string[]>()
  const spoken = new RegExp(`<meaning m_lang="${locale}">(.*?)</meaning>`, 'g')

  for (const [, body = ''] of xml.matchAll(ENTRY)) {
    const character = LITERAL.exec(body)?.[1]
    if (character === undefined) continue

    glossed.set(
      character,
      [...body.matchAll(spoken)]
        .map(([, gloss = '']) => gloss)
        .filter((gloss) => !LISTING.test(gloss))
        .map((gloss) => plain(gloss))
        .filter((gloss, at, all) => gloss !== '' && all.indexOf(gloss) === at),
    )
  }

  return glossed
}

// Two glosses telling themselves apart only by their asides are one word once the asides are gone, so
// the caller sees the word once: a list holding it twice is a list no order over it can satisfy, and
// the character would be asked for forever.
function plain(gloss: string): string {
  return gloss.replace(ASIDE, '').replace(QUOTES, '').replace(/\s+/g, ' ').trim()
}
