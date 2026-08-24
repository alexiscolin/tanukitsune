// JMdict states each word once, its written forms under keb, its kana under reb, and each sense's
// glosses under gloss with the language on an attribute. The glosses of one language are the whole of
// what the corpus takes from it: parts of speech, fields and priority markers are read from nowhere.
//
// Read with expressions rather than through a parser dependency, for the reason kanjidic.ts states:
// one machine-generated file at a pinned release, and the shape taken from it is two fields deep. The
// licence and the attribution it obliges are in docs/sources.md.
//
// The language codes are three letters here where KANJIDIC2's are two, so the locale is translated on
// the way in rather than spelled its own way at every call site.

// A parenthesis qualifies a gloss for somebody reading a dictionary and means nothing on a card, where
// the meaning is the whole of what a learner types: the release states "sushi (plat)" and a reader
// types sushi. The same rule kanjidic.ts states, for the same reason and against the same releases.
const ASIDE = /\s*\([^)]*\)/g

const ENTRY = /<entry>([\s\S]*?)<\/entry>/g
const KEB = /<keb>(.*?)<\/keb>/g
const REB = /<reb>(.*?)<\/reb>/g

// The three-letter code the release uses for a two-letter locale. Absent where nothing maps, which is
// what stops a locale silently reading English by falling through to the unattributed gloss.
const SPOKEN: Readonly<Record<string, string>> = { fr: 'fre', de: 'ger', es: 'spa', nl: 'dut', ru: 'rus' }

export function parseWords(xml: string, locale: string): ReadonlyMap<string, readonly string[]> {
  const said = new Map<string, readonly string[]>()
  // English carries no attribute at all, the release implying it by its absence, so it is the one
  // language that cannot be asked for by name.
  const glossed =
    locale === 'en'
      ? /<gloss>(.*?)<\/gloss>/g
      : new RegExp(`<gloss xml:lang="${SPOKEN[locale] ?? locale}"[^>]*>(.*?)</gloss>`, 'g')

  for (const [, body = ''] of xml.matchAll(ENTRY)) {
    const glosses = [...body.matchAll(glossed)]
      .map(([, gloss = '']) => gloss.replace(ASIDE, '').trim())
      // A gloss that is nothing but an aside leaves no word behind, and an empty string is not a
      // meaning a reader can be graded on.
      .filter((gloss) => gloss !== '')
    if (glosses.length === 0) continue

    // The written forms first, since that is how the curriculum spells a word. A word it deals in kana
    // alone has none, and its kana is what it is found under instead.
    const written = [...body.matchAll(KEB)].map(([, form = '']) => form)
    const forms = written.length > 0 ? written : [...body.matchAll(REB)].map(([, form = '']) => form)

    // The first entry stating a form wins. The release orders its entries by how common a word is, so
    // a later entry sharing a form is the rarer reading of it and would answer for the wrong word.
    for (const form of forms) if (!said.has(form)) said.set(form, glosses)
  }

  return said
}
