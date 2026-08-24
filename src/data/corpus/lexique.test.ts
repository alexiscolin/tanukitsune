import { describe, expect, it } from 'vitest'

import { parseLexicon } from './lexique'

// The release is one tab-separated row per written form and grammatical category, so a form that is
// both a noun and a verb is stated twice. Columns are found by the name the header gives them rather
// than by position: the release states thirty-five and carries the ones read here among them.
//
// `phon` is the release's own phonemic code and not the IPA: `@` is the nasal of "temps" where SAMPA
// would read it as a schwa, and the schwa is `°`. Every symbol is one character.
const RELEASE = [
  'ortho\tphon\tcgram\tnbsyll\tfreqfilms2',
  'chose\tSoz\tNOM\t1\t1321.79',
  'temps\tt@\tNOM\t1\t1031.05',
  'hôtel\totEl\tNOM\t2\t72.11',
  'petit\tp°ti\tADJ\t2\t343.22',
  'brun\tbR1\tADJ\t1\t7.09',
  'bon\tb§\tADJ\t1\t597.02',
  'vin\tv5\tNOM\t1\t53.42',
  'deux\td2\tADJ:num\t1\t476.03',
  'soeur\ts9R\tNOM\t1\t118.71',
  'huit\t8it\tADJ:num\t1\t34.19',
  'agneau\taNo\tNOM\t2\t6.35',
  'parking\tpaRkiG\tNOM\t2\t14.53',
  'jerez\txeREs\tNOM\t2\t0.06',
  'a\ta\tNOM\t1\t81.36',
  'a\ta\tAUX\t1\t6350.91',
  'a\ta\tVER\t1\t5498.34',
].join('\n')

describe('parseLexicon', () => {
  it('carries what an anchor is judged on: the sounds, how common the word is, and what part of speech it is', () => {
    const lexicon = parseLexicon(RELEASE)

    expect(lexicon.get('chose')).toEqual({ phonemes: ['ʃ', 'o', 'z'], frequency: 1321.79, category: 'NOM' })
  })

  it('writes the release own code as the IPA the sound rules compare against', () => {
    const lexicon = parseLexicon(RELEASE)
    const phonemes = (word: string) => lexicon.get(word)?.phonemes

    // The nasals, which the release writes as digits and punctuation and no two the same way.
    expect(phonemes('temps')).toEqual(['t', 'ɑ̃'])
    expect(phonemes('bon')).toEqual(['b', 'ɔ̃'])
    expect(phonemes('vin')).toEqual(['v', 'ɛ̃'])
    expect(phonemes('brun')).toEqual(['b', 'ʁ', 'œ̃'])
    // The schwa, against the nasal above, since one wrong reading of `@` moves every word carrying it.
    expect(phonemes('petit')).toEqual(['p', 'ə', 't', 'i'])
    // The vowels the release writes in capitals, and the rounded pair a single feature separates.
    expect(phonemes('hôtel')).toEqual(['o', 't', 'ɛ', 'l'])
    expect(phonemes('deux')).toEqual(['d', 'ø'])
    expect(phonemes('soeur')).toEqual(['s', 'œ', 'ʁ'])
    // The glide of "huit", which is neither the one of "oui" nor a vowel.
    expect(phonemes('huit')).toEqual(['ɥ', 'i', 't'])
    expect(phonemes('agneau')).toEqual(['a', 'ɲ', 'o'])
  })

  it('refuses a word whose sounds the rules cannot place', () => {
    const lexicon = parseLexicon(RELEASE)

    // Two of the release's thirty-seven symbols name sounds French borrows rather than owns, and the
    // articulatory table has no features for either. A word carrying one cannot be measured against a
    // reading, so it is no candidate at all: kept, it would be compared on sounds nothing describes.
    expect(lexicon.has('parking')).toBe(false)
    expect(lexicon.has('jerez')).toBe(false)
  })

  it('keeps one row per written form, the most common one', () => {
    const lexicon = parseLexicon(RELEASE)

    // A form stated once per grammatical category would otherwise let the rarest reading of it stand
    // for the word, and how common a word is decides which reading takes a contested anchor.
    expect(lexicon.get('a')?.frequency).toBe(6350.91)
    expect(lexicon.get('a')?.category).toBe('AUX')
  })
})
