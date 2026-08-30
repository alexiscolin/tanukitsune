import { describe, expect, it } from 'vitest'

import type { Named } from './reading-run'
import type { Word } from './lexique'
import { candidatesBy, wantedFrom } from './anchor-run'

const READINGS = new Map<string, Named>([
  ['こう', { type: 'onyomi', taught: true, by: ['工', '公'] }],
  ['いつ', { type: 'onyomi', taught: false, by: ['一'] }],
  ['ひとり', { type: null, taught: true, by: ['一人'] }],
  ['おたんじょうびおめでとう', { type: null, taught: true, by: ['お誕生日おめでとう'] }],
])

const LEXICON = new Map<string, Word>([
  ['cause', { phonemes: ['k', 'o', 'z'], frequency: 120.4, category: 'NOM' }],
  ['coq', { phonemes: ['k', 'ɔ', 'k'], frequency: 8.1, category: 'NOM' }],
  ['classer', { phonemes: ['k', 'l', 'a', 's', 'e'], frequency: 2.3, category: 'VER' }],
  ['taupe', { phonemes: ['t', 'o', 'p'], frequency: 1.7, category: 'NOM', imageability: 81.3 }],
])

describe('wantedFrom', () => {
  it('asks for an anchor only where a card teaches the reading', () => {
    expect(wantedFrom(READINGS, 4).map((one) => one.value)).toEqual(['こう', 'ひとり'])
  })

  // An anchor is one word standing for one reading, and no word carries eleven morae. Asked for one
  // anyway, a long reading takes whatever the distance forgives, since that distance is a fraction of
  // the sounds compared and a long word shares a great many of them without sounding like it at all.
  // No reading a kanji teaches is longer than four, so the ceiling touches words alone.
  it('asks for no anchor where the reading is longer than one word can carry', () => {
    expect(wantedFrom(READINGS, 4).map((one) => one.value)).not.toContain('おたんじょうびおめでとう')
  })

  // The reading's sounds are derived from its kana here, never written beside it: a reading and a
  // pronunciation kept side by side are two things to keep in step, and one of them will be wrong.
  it('derives the sounds of a reading rather than carrying them', () => {
    expect(wantedFrom(READINGS, 4)[0]).toEqual({ value: 'こう', phonemes: ['k', 'o', 'o'] })
  })

  // A reading is heard through the ears of the language being taught in before it is compared. し is
  // /ɕi/ and French makes no /ɕ/, but a French listener reaches for the sound of chic without
  // hesitating, and a rule exact on the symbol leaves 128 readings with nothing rather than with that.
  // The substitution moves the reading and never the anchor, so a word still claims only sounds its
  // own language makes: what French reaches for when it hears nothing at all, as with /h/, is absent
  // from the table and those readings stay unanchored.
  // A locale may reach for nothing at all on a sound, which is not the same as reaching for a
  // neighbour: the reading then begins on what follows, and what carries the lost sound is the
  // spelling of the word rather than its pronunciation.
  it('drops a sound the locale reaches for nothing on', () => {
    const heard = wantedFrom(new Map([['はち', { type: 'kunyomi' as const, taught: true, by: ['八'] }]]), 4, new Map([['h', '']]))

    expect(heard[0]?.phonemes).toEqual(['a', 'tɕ', 'i'])
  })

  // A substitution may not bring two Japanese sounds onto one. し is /ɕi/ and ち is /tɕi/, and hearing
  // both as the sound of chic gives them one onset, which is the position the rules treat as decisive:
  // a reader handed that word produces one of the two and is graded on the other.
  it('refuses a table bringing two sounds onto one', () => {
    const merged = new Map([
      ['ɕ', 'ʃ'],
      ['tɕ', 'ʃ'],
    ])

    expect(() => wantedFrom(READINGS, 4, merged)).toThrow(/ʃ/)
  })

  // Nor onto a sound the language taught already makes on its own, which is the same merge seen from
  // the other side: つ heard as /s/ is す, which needs no substitution to be /s/.
  it('refuses a table bringing a sound onto one the reading already carries', () => {
    expect(() => wantedFrom(new Map([['すつ', { type: null, taught: true, by: ['素通'] }]]), 4, new Map([['ts', 's']]))).toThrow(
      /s/,
    )
  })

  it('hears a reading through the sounds the locale reaches for', () => {
    const heard = wantedFrom(new Map([['しゃ', { type: 'onyomi' as const, taught: true, by: ['車'] }]]), 4, new Map([['ɕ', 'ʃ']]))

    expect(heard[0]?.phonemes[0]).toBe('ʃ')
  })
})

describe('candidatesBy', () => {
  // A word can only stand for a reading it begins like, so the lexicon is held by first sound. Walked
  // whole for each reading, 2898 readings would each read 125461 words, and the run would not end.
  it('offers only the words a reading could begin like', () => {
    const candidates = candidatesBy(LEXICON, () => true)
    const reading = { value: 'こう', phonemes: ['k', 'o', 'o'] }

    expect(candidates(reading).map((one) => one.text).sort()).toEqual(['cause', 'classer', 'coq'])
  })

  // Which words a locale draws anchors from is that locale's business rather than the engine's, and a
  // story is built on what a reader can picture, so the run is told what to keep rather than deciding.
  // Which sound a reading begins on is not the only thing that can be asked of a candidate: a locale
  // may have a sound it writes without saying it, and then what qualifies a word is how it is spelled.
  it('lets the locale ask about the written word as well as the spoken one', () => {
    const written = candidatesBy(LEXICON, (_word, text) => text.startsWith('c'))
    const reading = { value: 'こう', phonemes: ['k', 'o', 'o'] }

    expect(written(reading).map((one) => one.text).sort()).toEqual(['cause', 'classer', 'coq'])
  })

  it('keeps only the words the locale offers', () => {
    const nouns = candidatesBy(LEXICON, (word) => word.category === 'NOM')
    const reading = { value: 'こう', phonemes: ['k', 'o', 'o'] }

    expect(nouns(reading).map((one) => one.text).sort()).toEqual(['cause', 'coq'])
  })

  // Where two words sound equally near, which happens for half the readings that have candidates at
  // all, what decides is how well each can be seen. A rating dropped on the way here would leave that
  // half to be settled by frequency alone.
  it('carries what ranks a word, its rating included where it has one', () => {
    const candidates = candidatesBy(LEXICON, () => true)

    expect(candidates({ value: 'とう', phonemes: ['t', 'o', 'o'] })).toEqual([
      { text: 'taupe', phonemes: ['t', 'o', 'p'], frequency: 1.7, imageability: 81.3 },
    ])
  })

  it('rates no word the norms left unrated, rather than rating it low', () => {
    const candidates = candidatesBy(LEXICON, () => true)

    expect(candidates({ value: 'こう', phonemes: ['k', 'o', 'o'] })[0]).not.toHaveProperty('imageability')
  })
})
