import { describe, expect, it } from 'vitest'

import { parseGlosses } from './kanjidic'

// Two entries as the release states them: a meaning carries its language on an attribute, and
// everything around them is reading data the corpus does not take.
const XML = `<kanjidic2>
<character><literal>犬</literal><reading_meaning><rmgroup>
<reading r_type="ja_on">ケン</reading>
<meaning>dog</meaning>
<meaning m_lang="es">perro</meaning>
<meaning m_lang="fr">chien</meaning>
<meaning m_lang="fr">canidé</meaning>
</rmgroup></reading_meaning></character>
<character><literal>々</literal><reading_meaning><rmgroup>
<reading r_type="ja_on">ノマ</reading>
</rmgroup></reading_meaning></character>
</kanjidic2>`

describe('parseGlosses', () => {
  it('reads every gloss the release states in the asked language', () => {
    expect(parseGlosses(XML, 'fr').get('犬')).toEqual(['chien', 'canidé'])
  })

  // English is the one language stated by the absence of an attribute rather than by its name.
  it('reads English from the meanings that carry no language', () => {
    expect(parseGlosses(XML, 'en').get('犬')).toEqual(['dog'])
  })

  it('reads nothing for a language the release does not carry', () => {
    expect(parseGlosses(XML, 'de').get('犬')).toEqual([])
  })

  // The repetition mark is dealt by the curriculum and glossed by nobody, so a character stated with
  // no meaning at all has to survive the read rather than fail it.
  it('carries a character the release states without a meaning', () => {
    expect(parseGlosses(XML, 'fr').get('々')).toEqual([])
  })
})
