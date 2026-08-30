import { describe, expect, it } from 'vitest'

import type { InventorySubject } from './inventory'
import { readingsOf, unconfirmed, wordsResting } from './reading-run'

const subject = (one: Partial<InventorySubject> & Pick<InventorySubject, 'id' | 'type' | 'characters'>): InventorySubject => ({
  level: 1,
  hidden: false,
  meanings: [],
  readings: [],
  componentIds: [],
  ...one,
})

// A kanji states every reading the account accepts and marks the one it teaches. A word states the
// reading it is dealt under and no type, the distinction belonging to the character rather than to it.
const CURRICULUM = [
  subject({
    id: 1,
    type: 'kanji',
    characters: '一',
    readings: [
      { value: 'いち', type: 'onyomi', primary: true },
      { value: 'いつ', type: 'onyomi', primary: false },
    ],
  }),
  subject({
    id: 2,
    type: 'kanji',
    characters: '人',
    readings: [{ value: 'にん', type: 'onyomi', primary: true }],
  }),
  subject({ id: 3, type: 'vocabulary', characters: '一人', readings: [{ value: 'ひとり', type: null, primary: true }] }),
  subject({ id: 4, type: 'vocabulary', characters: '一', readings: [{ value: 'いち', type: null, primary: true }] }),
  // A word written in kana alone states no reading, the word being its own: the curriculum leaves the
  // list empty rather than repeating the characters into it.
  subject({ id: 5, type: 'kana_vocabulary', characters: 'ありがとう' }),
]

describe('readingsOf', () => {
  it('teaches the reading a card is asked for and no more', () => {
    const readings = readingsOf(CURRICULUM)

    // 一 is taught under いち, so the word 一 rests on it and asks for nothing of its own.
    expect(readings.get('いち')).toEqual({ type: 'onyomi', taught: true, by: ['一'] })
    // ひとり is neither of its characters' taught readings, so the word teaches it.
    expect(readings.get('ひとり')).toEqual({ type: null, taught: true, by: ['一人'] })
  })

  // The account grades them as correct and no card teaches them, so they take no anchor and get no
  // mnemonic. Dropped instead of marked, a later run would have no way to tell a reading it has never
  // seen from one it decided against.
  it('carries a reading the account accepts without teaching it, and says it teaches nothing', () => {
    expect(readingsOf(CURRICULUM).get('いつ')).toEqual({ type: 'onyomi', taught: false, by: ['一'] })
  })

  it('teaches a word written in kana alone, which rests on no character at all', () => {
    expect(readingsOf(CURRICULUM).get('ありがとう')).toEqual({ type: null, taught: true, by: ['ありがとう'] })
  })
})

describe('unconfirmed', () => {
  // The reading taught has to exist for that character in the release and be of the type claimed,
  // which is what catches a sound the character does not carry being taught for it.
  it('names a taught reading the release states otherwise, and leaves a confirmed one alone', () => {
    const stated = new Map([
      ['一', [{ value: 'いち', type: 'onyomi' as const }]],
      ['人', [{ value: 'じん', type: 'onyomi' as const }]],
    ])

    expect(unconfirmed(CURRICULUM, stated)).toEqual([{ character: '人', value: 'にん', type: 'onyomi' }])
  })

  it('says nothing about a character the release does not state at all, which is not a reading being wrong', () => {
    expect(unconfirmed(CURRICULUM, new Map())).toEqual([])
  })
})

describe('wordsResting', () => {
  // A total announced in prose that no command prints is a total nobody can check against the
  // curriculum it claims to describe.
  it('counts the words dealt and how many rest on what their characters taught', () => {
    expect(wordsResting(CURRICULUM)).toEqual({ dealt: 3, resting: 1 })
  })

  it('counts no word the source has withdrawn, which no session deals', () => {
    const gone = CURRICULUM.map((one) => (one.type === 'vocabulary' ? { ...one, hidden: true } : one))

    expect(wordsResting(gone).dealt).toBe(1)
  })
})
