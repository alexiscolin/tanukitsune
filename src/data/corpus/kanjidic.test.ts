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
<character><literal>乙</literal><reading_meaning><rmgroup>
<meaning m_lang="fr">radical hameçon (no. 5)</meaning>
<meaning m_lang="fr">chic</meaning>
</rmgroup></reading_meaning></character>
<character><literal>低</literal><reading_meaning><rmgroup>
<meaning m_lang="fr">petit (taille)</meaning>
<meaning m_lang="fr">(sens figuré)</meaning>
<meaning m_lang="fr">bas</meaning>
</rmgroup></reading_meaning></character>
<character><literal>々</literal><reading_meaning><rmgroup>
<reading r_type="ja_on">ノマ</reading>
</rmgroup></reading_meaning></character>
</kanjidic2>`

describe('parseGlosses', () => {
  it('reads every gloss the release states in the asked language', () => {
    expect(parseGlosses(XML, 'fr').get('犬')).toEqual(['chien', 'canidé'])
  })

  // The release states the Kangxi listing as a meaning of its own, which describes the character
  // rather than saying what it means, so it can never be the word a reader is graded on.
  it('leaves out the gloss naming the character as a numbered radical', () => {
    expect(parseGlosses(XML, 'fr').get('乙')).toEqual(['chic'])
  })

  // A parenthesis qualifies a gloss for a dictionary reader and means nothing on a card, where the key
  // is the whole of what a learner types. The word it qualifies is kept and the aside is not, and a
  // gloss that is nothing but an aside leaves no word behind.
  it('keeps the word a parenthesis qualifies and drops the aside', () => {
    expect(parseGlosses(XML, 'fr').get('低')).toEqual(['petit', 'bas'])
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
