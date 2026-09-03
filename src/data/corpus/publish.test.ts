import { describe, expect, it } from 'vitest'

import { rowsToPublish } from './publish'
import type { Publishable } from './publish'
import type { InventorySubject } from './inventory'

const REST: Publishable = {
  subjectId: '451',
  key: 'repos',
  englishKey: 'Rest',
  parts: ['le passant', "l'arbre"],
  reading: 'キュウ',
  anchor: 'le képi',
  anchorPhonemes: ['k', 'e', 'p', 'i'],
}

// A subject as the curriculum states it. Only the four fields the walk reads are varied by the cases
// below, so the rest is stated once.
function subject(one: Partial<InventorySubject>): InventorySubject {
  return {
    id: 451,
    type: 'kanji',
    level: 2,
    characters: '休',
    hidden: false,
    meanings: [],
    readings: [],
    componentIds: [],
    ...one,
  }
}

const WROTE = {
  names: { 亻: 'le passant' },
  keys: { 休: 'repos' },
  words: { 休み: 'le congé' },
  bound: new Map(),
}

const STAMP = { locale: 'fr', writtenBy: 'hand', promptVersion: '', corpusVersion: '9a1c2f0e' }

const told = (one: Partial<{ meaning: string; reading: string; nuance: string }>) => ({
  meaning: '',
  reading: '',
  nuance: '',
  ...one,
})

const KANJI = [subject({})]
const CARDS = new Map([['休', REST]])

describe('rowsToPublish', () => {
  it('writes what a card shows and what a check reads', () => {
    const written = new Map([['休', told({ meaning: 'une histoire', reading: 'une autre', nuance: 'la pause' })]])

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written }, STAMP)).toEqual([
      {
        subjectId: '451',
        locale: 'fr',
        meaning: 'repos',
        englishKey: 'Rest',
        nuance: 'la pause',
        mnemonic: 'une histoire',
        readingMnemonic: 'une autre',
        reading: 'キュウ',
        anchor: 'le képi',
        anchorPhonemes: ['k', 'e', 'p', 'i'],
        parts: ['le passant', "l'arbre"],
        generatedBy: 'hand',
        promptVersion: '',
        corpusVersion: '9a1c2f0e',
      },
    ])
  })

  // A card answered in the reader's language is worth more than no card at all, and most of the
  // curriculum has a word written and no story yet. The story columns stay empty rather than holding
  // the row back, and the card shows what it has.
  it('writes the word where no story is written', () => {
    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written: new Map() }, STAMP)[0]).toMatchObject({
      meaning: 'repos',
      nuance: '',
      mnemonic: '',
    })
  })

  it('writes the word where only the nuance is written', () => {
    const written = new Map([['休', told({ nuance: 'la pause' })]])

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written }, STAMP)[0]).toMatchObject({
      nuance: 'la pause',
      mnemonic: '',
    })
  })

  // The two kinds nothing writes a story for, and the reason the walk is by subject: a radical and the
  // kanji it draws share a character, so a map keyed by one holds whichever came last.
  it('writes a shape under the name the locale gave it', () => {
    const shape = [subject({ id: 1, type: 'radical', characters: '亻' })]

    expect(rowsToPublish(shape, { wrote: WROTE, cards: CARDS, written: new Map() }, STAMP)[0]).toMatchObject({
      subjectId: '1',
      meaning: 'le passant',
      mnemonic: '',
    })
  })

  it('writes a word under the meaning the locale gave it', () => {
    const word = [subject({ id: 9, type: 'vocabulary', characters: '休み' })]

    expect(rowsToPublish(word, { wrote: WROTE, cards: CARDS, written: new Map() }, STAMP)[0]).toMatchObject({
      subjectId: '9',
      meaning: 'le congé',
    })
  })

  // A subject the locale has no word for cannot be asked in this language at all, so it publishes
  // nothing rather than a row falling back to the source's own.
  it('writes nothing for a subject the locale has no word for', () => {
    const unknown = [subject({ id: 7, characters: '姉' })]

    expect(rowsToPublish(unknown, { wrote: WROTE, cards: CARDS, written: new Map() }, STAMP)).toEqual([])
  })

  // A component carries no reading and a word often rests on the one its kanji gave, so the reading
  // columns are empty rather than absent: the row is still a card.
  it('leaves the reading columns empty where no reading story is written', () => {
    const bare = new Map([['休', { ...REST, reading: null, anchor: null, anchorPhonemes: null }]])
    const written = new Map([['休', told({ meaning: 'une histoire', nuance: 'la pause' })]])

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: bare, written }, STAMP)[0]).toMatchObject({
      readingMnemonic: null,
      reading: null,
      anchor: null,
      anchorPhonemes: null,
    })
  })

  // A story written for a character no subject deals reaches no row: the walk is over the curriculum,
  // so a story with nothing to attach to is named by the report rather than written.
  it('writes nothing for a story with no subject behind it', () => {
    const written = new Map([['姉', told({ meaning: 'une histoire', nuance: 'la soeur' })]])

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written }, STAMP)[0]?.mnemonic).toBe('')
  })
})
