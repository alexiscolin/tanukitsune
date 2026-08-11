// KANJIDIC2 states each character with its readings and its meanings, one element per gloss, the
// language on an attribute and English implied by its absence. The glosses of one language are the
// whole of what the corpus takes from it: grades, stroke counts and readings are read from elsewhere.
//
// Read with expressions rather than through a parser dependency, for the reason kanjivg.ts states: one
// machine-generated file at a pinned release, and the shape taken from it is two fields deep. The
// licence and the attribution it obliges are in docs/sources.md.

const ENTRY = /<character>([\s\S]*?)<\/character>/g
const LITERAL = /<literal>(.*?)<\/literal>/

export function parseGlosses(xml: string, locale: string): ReadonlyMap<string, readonly string[]> {
  const glossed = new Map<string, readonly string[]>()
  const spoken = new RegExp(`<meaning m_lang="${locale}">(.*?)</meaning>`, 'g')

  for (const [, body = ''] of xml.matchAll(ENTRY)) {
    const character = LITERAL.exec(body)?.[1]
    if (character === undefined) continue

    glossed.set(character, [...body.matchAll(spoken)].map(([, gloss = '']) => gloss))
  }

  return glossed
}
