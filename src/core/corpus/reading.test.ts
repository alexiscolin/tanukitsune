import { describe, expect, it } from 'vitest'

import { restsOnItsKanji } from './reading'

// The curriculum teaches one reading per character and accepts the others without teaching them, so
// what a word rests on is that one reading rather than the character's whole set. Every pair here is
// the curriculum's own.
const TAUGHT = new Map([
  ['三', 'さん'],
  ['人', 'にん'],
  ['学', 'がく'],
  ['校', 'こう'],
  ['手', 'て'],
  ['紙', 'かみ'],
  ['丸', 'まる'],
  ['語', 'ご'],
  ['一', 'いち'],
  ['花', 'はな'],
  ['火', 'か'],
  ['出', 'しゅつ'],
])

describe('restsOnItsKanji', () => {
  it('rests where each character gives exactly the reading it was taught under', () => {
    expect(restsOnItsKanji('三人', 'さんにん', TAUGHT)).toBe(true)
  })

  it('rests where a reading shortens to a held consonant, which is the same reading said in a word', () => {
    expect(restsOnItsKanji('学校', 'がっこう', TAUGHT)).toBe(true)
  })

  it('rests where the second reading voices, which the reader meets as a pattern rather than a reading', () => {
    expect(restsOnItsKanji('手紙', 'てがみ', TAUGHT)).toBe(true)
  })

  // The other half of that pattern: a reading opening on は hardens rather than voices where a held
  // consonant precedes it, and a reader meets the two together or neither.
  it('rests where a reading opening on は hardens after a held consonant', () => {
    expect(restsOnItsKanji('一杯', 'いっぱい', new Map([...TAUGHT, ['杯', 'はい']]))).toBe(true)
  })

  it('rests where kana the word carries stand for themselves', () => {
    expect(restsOnItsKanji('丸い', 'まるい', TAUGHT)).toBe(true)
    // The reading is written in one kana and the word in the other, so the two are compared in one.
    expect(restsOnItsKanji('フランス語', 'ふらんすご', TAUGHT)).toBe(true)
  })

  // Each of these is a card that has to teach a reading, since nothing the reader has met gives it.
  it('earns a mnemonic where the word is read as nothing its characters taught', () => {
    expect(restsOnItsKanji('一人', 'ひとり', TAUGHT)).toBe(false)
    expect(restsOnItsKanji('出る', 'でる', TAUGHT)).toBe(false)
  })

  // A word dealt in kana alone has no character to rest on, and its card runs from the sound to the
  // meaning rather than from parts to a sound. Read as kana standing for themselves it would rest on
  // nothing and be called known, which is the one word shape that teaches its reading unconditionally.
  it('earns a mnemonic where the word is written in kana alone', () => {
    expect(restsOnItsKanji('ありがとう', 'ありがとう', TAUGHT)).toBe(false)
    expect(restsOnItsKanji('コーヒー', 'こーひー', TAUGHT)).toBe(false)
  })

  it('earns a mnemonic where a voiced sound is not the voicing of the taught one', () => {
    // 火 is taught か, which voices to が. はなび carries び, a voicing of the ひ this reader has not
    // been shown, so the word teaches a reading rather than a pattern over one.
    expect(restsOnItsKanji('花火', 'はなび', TAUGHT)).toBe(false)
    // Same for a second reading of a character: にん voices to じん in no rule, they are two readings.
    expect(restsOnItsKanji('アメリカ人', 'あめりかじん', TAUGHT)).toBe(false)
  })
})
