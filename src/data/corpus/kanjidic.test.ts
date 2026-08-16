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
<meaning m_lang="fr">"(x) ans" (âge)</meaning>
<meaning m_lang="fr">petit (âge)</meaning>
<meaning m_lang="fr">10000</meaning>
<meaning m_lang="fr">s'appeler</meaning>
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
    expect(parseGlosses(XML, 'fr').get('低')).toEqual(['petit', 'ans', "s'appeler", 'bas'])
  })

  // Two glosses telling themselves apart only by their asides are one word once the asides are gone,
  // and an order over a list holding the same word twice is one no answer can satisfy. The gloss is
  // kept once, so a character stays answerable.
  it('keeps a word once where two glosses cleaned down to it', () => {
    expect(parseGlosses(XML, 'fr').get('低')?.filter((one) => one === 'petit')).toHaveLength(1)
  })

  // The release quotes a gloss that quotes itself. Stripping the aside out of the middle of it leaves
  // the quotes around nothing, and a key is a word rather than punctuation.
  it('leaves no quotation behind when an aside sat inside one', () => {
    expect(parseGlosses(XML, 'fr').get('低')).not.toContain('" ans"')
  })

  // The apostrophe is a letter's neighbour in French, not a quotation, and a gloss losing it is a word
  // no dictionary states.
  it('keeps an apostrophe inside a word', () => {
    expect(parseGlosses(XML, 'fr').get('低')).toContain("s'appeler")
  })

  // English is the one language the release states by the absence of an attribute rather than by name,
  // and it is what a character with no gloss in the locale is carried across from.
  it('reads English from the meanings that carry no language', () => {
    expect(parseGlosses(XML, 'en').get('犬')).toEqual(['dog'])
  })

  // The release states a numeral as a meaning of its own, 10000 for 万, which is what the character
  // counts rather than a word anybody types. A gloss carrying no letter at all is not a word.
  it('leaves out a gloss carrying no letter', () => {
    expect(parseGlosses(XML, 'fr').get('低')).not.toContain('10000')
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
