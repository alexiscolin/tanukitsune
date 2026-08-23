import { describe, expect, it } from 'vitest'

import { parseWords } from './jmdict'

// The release states one entry per word, its written forms under keb, its kana under reb, and each
// sense's glosses under gloss with the language on an attribute. English carries none, the release
// implying it by its absence, and the codes are three letters where KANJIDIC2's are two.
const RELEASE = `<JMdict>
<entry>
<k_ele><keb>日本</keb></k_ele>
<r_ele><reb>にほん</reb></r_ele>
<sense><gloss>Japan</gloss><gloss xml:lang="fre">Japon</gloss></sense>
</entry>
<entry>
<k_ele><keb>出る</keb></k_ele>
<r_ele><reb>でる</reb></r_ele>
<sense><gloss xml:lang="fre">sortir</gloss></sense>
<sense><gloss xml:lang="fre">partir</gloss><gloss xml:lang="fre">quitter</gloss></sense>
</entry>
<entry>
<r_ele><reb>ありがとう</reb></r_ele>
<sense><gloss xml:lang="fre">merci</gloss></sense>
</entry>
<entry>
<k_ele><keb>寿司</keb></k_ele>
<r_ele><reb>すし</reb></r_ele>
<sense><gloss>sushi</gloss></sense>
</entry>
</JMdict>`

describe('parseWords', () => {
  it('reads a word by the form the curriculum writes it in', () => {
    expect(parseWords(RELEASE, 'fr').get('日本')).toEqual(['Japon'])
  })

  // Several senses and several glosses inside one, flattened in the order the release states them: a
  // reader typing any of them means the word, and which sense they had in mind is not asked.
  it('keeps every gloss of every sense, in the order stated', () => {
    expect(parseWords(RELEASE, 'fr').get('出る')).toEqual(['sortir', 'partir', 'quitter'])
  })

  // A word the curriculum deals in kana alone has no written form to be found under, so its kana is
  // what it is found under instead.
  it('reads a word with no written form by its kana', () => {
    expect(parseWords(RELEASE, 'fr').get('ありがとう')).toEqual(['merci'])
  })

  // A word the release states in English alone is not half-written into the corpus: it is absent, and
  // absent is what says the word is owed to somebody else.
  it('leaves out a word this language does not gloss', () => {
    expect(parseWords(RELEASE, 'fr').has('寿司')).toBe(false)
  })

  it('reads English, which the release states by attributing nothing', () => {
    expect(parseWords(RELEASE, 'en').get('寿司')).toEqual(['sushi'])
    expect(parseWords(RELEASE, 'en').get('日本')).toEqual(['Japan'])
  })
})
