import { describe, expect, it } from 'vitest'

import type { Named } from './reading-run'
import type { Word } from './lexique'
import { candidatesBy, wantedFrom } from './anchor-run'

const READINGS = new Map<string, Named>([
  ['こう', { type: 'onyomi', taught: true, by: ['工', '公'] }],
  ['いつ', { type: 'onyomi', taught: false, by: ['一'] }],
  ['ひとり', { type: null, taught: true, by: ['一人'] }],
])

const LEXICON = new Map<string, Word>([
  ['cause', { phonemes: ['k', 'o', 'z'], frequency: 120.4, category: 'NOM' }],
  ['coq', { phonemes: ['k', 'ɔ', 'k'], frequency: 8.1, category: 'NOM' }],
  ['classer', { phonemes: ['k', 'l', 'a', 's', 'e'], frequency: 2.3, category: 'VER' }],
  ['taupe', { phonemes: ['t', 'o', 'p'], frequency: 1.7, category: 'NOM' }],
])

describe('wantedFrom', () => {
  it('asks for an anchor only where a card teaches the reading', () => {
    expect(wantedFrom(READINGS).map((one) => one.value)).toEqual(['こう', 'ひとり'])
  })

  // The reading's sounds are derived from its kana here, never written beside it: a reading and a
  // pronunciation kept side by side are two things to keep in step, and one of them will be wrong.
  it('derives the sounds of a reading rather than carrying them', () => {
    expect(wantedFrom(READINGS)[0]).toEqual({ value: 'こう', phonemes: ['k', 'o', 'o'] })
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
  it('keeps only the words the locale offers', () => {
    const nouns = candidatesBy(LEXICON, (word) => word.category === 'NOM')
    const reading = { value: 'こう', phonemes: ['k', 'o', 'o'] }

    expect(nouns(reading).map((one) => one.text).sort()).toEqual(['cause', 'coq'])
  })

  it('carries what ranks a word, and rates none of them, the lexicon stating no imageability', () => {
    const candidates = candidatesBy(LEXICON, () => true)

    expect(candidates({ value: 'とう', phonemes: ['t', 'o', 'o'] })).toEqual([
      { text: 'taupe', phonemes: ['t', 'o', 'p'], frequency: 1.7 },
    ])
  })
})
