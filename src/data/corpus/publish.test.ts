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

const STAMP = { locale: 'fr', writtenBy: 'claude-opus-5', promptVersion: '', corpusVersion: '9a1c2f0e' }

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

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written, shapes: new Map() }, STAMP)).toEqual([
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
        generatedBy: 'claude-opus-5',
        promptVersion: '',
        corpusVersion: '9a1c2f0e',
      },
    ])
  })

  // A card answered in the reader's language is worth more than no card at all, and most of the
  // curriculum has a word written and no story yet. The story columns stay empty rather than holding
  // the row back, and the card shows what it has.
  it('writes the word where no story is written', () => {
    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written: new Map(), shapes: new Map() }, STAMP)[0]).toMatchObject({
      meaning: 'repos',
      nuance: '',
      mnemonic: '',
    })
  })

  it('writes the word where only the nuance is written', () => {
    const written = new Map([['休', told({ nuance: 'la pause' })]])

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written, shapes: new Map() }, STAMP)[0]).toMatchObject({
      nuance: 'la pause',
      mnemonic: '',
    })
  })

  // A shape is a card like any other and the reader meets it first, so it shows a story of its own.
  // Written under the key the locale named it by, which is the character or, for a shape the
  // curriculum draws rather than writes, the identifier.
  it('gives a shape the story written for it', () => {
    const shape = [subject({ id: 1, type: 'radical', characters: '亻' })]
    const shapes = new Map([['亻', told({ meaning: 'une histoire de forme', nuance: 'la nuance' })]])

    expect(rowsToPublish(shape, { wrote: WROTE, cards: CARDS, written: new Map(), shapes }, STAMP)[0]).toMatchObject({
      meaning: 'le passant',
      mnemonic: 'une histoire de forme',
      nuance: 'la nuance',
    })
  })

  // A shape a kanji already names is taught under one word, so it is one card twice and shows the one
  // story written for that word. Writing it a second time would be the same story said twice.
  it('gives a shape its kanji names the story that kanji shows', () => {
    const shape = [subject({ id: 1, type: 'radical', characters: '休' })]
    const written = new Map([['休', told({ meaning: 'une histoire', nuance: 'la pause' })]])

    expect(rowsToPublish(shape, { wrote: WROTE, cards: CARDS, written, shapes: new Map() }, STAMP)[0]).toMatchObject({
      meaning: 'repos',
      mnemonic: 'une histoire',
    })
  })

  // A shape and the kanji drawing it can be taught under different words, and then they are two cards
  // about two things. Handing the kanji's story to the shape would explain a word the shape does not
  // carry, so the shape shows nothing until somebody writes it one.
  it('leaves a shape named apart from its kanji without a story rather than borrowing one', () => {
    const apart = [subject({ id: 1, type: 'radical', characters: '休' })]
    const wrote = { ...WROTE, names: { ...WROTE.names, 休: 'le hamac' } }
    const written = new Map([['休', told({ meaning: 'une histoire de kanji', nuance: 'la pause' })]])

    expect(rowsToPublish(apart, { wrote, cards: CARDS, written, shapes: new Map() }, STAMP)[0]).toMatchObject({
      meaning: 'le hamac',
      mnemonic: '',
    })
  })

  // A shape the curriculum draws has no character to be found under, so its story is written under the
  // identifier the locale named it by. Fifteen shapes are keyed that way.
  it('gives a drawn shape the story written under its identifier', () => {
    const drawn = [subject({ id: 8766, type: 'radical', characters: null })]
    const wrote = { ...WROTE, names: { ...WROTE.names, 'radical#8766': 'le crochet' } }
    const shapes = new Map([['radical#8766', told({ meaning: 'il pend au mur: le crochet.' })]])

    expect(rowsToPublish(drawn, { wrote, cards: CARDS, written: new Map(), shapes }, STAMP)[0]).toMatchObject({
      meaning: 'le crochet',
      mnemonic: 'il pend au mur: le crochet.',
    })
  })

  // A word composes its meaning from the characters it is written with, so its story names the word
  // each of them is taught under, in the order they are written, and arrives at what the word means.
  it('gives a word the story written for it', () => {
    const word = [subject({ id: 9, type: 'vocabulary', characters: '休み', componentIds: [3] })]
    const wrote = { ...WROTE, words: { 休み: 'le congé' } }
    const shapes = new Map([['休み', told({ meaning: 'le repos vous tombe dessus: le congé.' })]])

    expect(rowsToPublish(word, { wrote, cards: CARDS, written: new Map(), shapes }, STAMP)[0]).toMatchObject({
      meaning: 'le congé',
      mnemonic: 'le repos vous tombe dessus: le congé.',
    })
  })

  // A word written with one kanji is that kanji: it is taught under the same word and is one card
  // twice, so it shows the story written for the kanji rather than a second one saying the same thing.
  it('gives a word written with one kanji the story that kanji shows', () => {
    const word = [subject({ id: 9, type: 'vocabulary', characters: '休', componentIds: [3] })]
    const wrote = { ...WROTE, words: { 休: 'repos' } }
    const written = new Map([['休', told({ meaning: 'une histoire de kanji', nuance: 'la pause' })]])

    expect(rowsToPublish(word, { wrote, cards: CARDS, written, shapes: new Map() }, STAMP)[0]).toMatchObject({
      meaning: 'repos',
      mnemonic: 'une histoire de kanji',
    })
  })

  // The kinds nothing writes a story for, and the reason the walk is by subject: a radical and the
  // kanji it draws share a character, so a map keyed by one holds whichever came last.
  it('writes a shape under the name the locale gave it', () => {
    const shape = [subject({ id: 1, type: 'radical', characters: '亻' })]

    expect(rowsToPublish(shape, { wrote: WROTE, cards: CARDS, written: new Map(), shapes: new Map() }, STAMP)[0]).toMatchObject({
      subjectId: '1',
      meaning: 'le passant',
      mnemonic: '',
    })
  })

  it('writes a word under the meaning the locale gave it', () => {
    const word = [subject({ id: 9, type: 'vocabulary', characters: '休み' })]

    expect(rowsToPublish(word, { wrote: WROTE, cards: CARDS, written: new Map(), shapes: new Map() }, STAMP)[0]).toMatchObject({
      subjectId: '9',
      meaning: 'le congé',
    })
  })

  // A shape the curriculum draws rather than writes has no character to be found under, so the locale
  // names it by the identifier the curriculum gives it. Without this the reader meets it in the
  // source's language, which is the one thing a row exists to prevent.
  it('writes a drawn shape under the name the locale gave its identifier', () => {
    const drawn = [subject({ id: 8766, type: 'radical', characters: null })]
    const wrote = { ...WROTE, names: { ...WROTE.names, 'radical#8766': 'le crochet' } }

    expect(rowsToPublish(drawn, { wrote, cards: CARDS, written: new Map(), shapes: new Map() }, STAMP)[0]).toMatchObject({
      subjectId: '8766',
      meaning: 'le crochet',
    })
  })

  // A subject the locale has no word for cannot be asked in this language at all, so it publishes
  // nothing rather than a row falling back to the source's own.
  it('writes nothing for a subject the locale has no word for', () => {
    const unknown = [subject({ id: 7, characters: '姉' })]

    expect(rowsToPublish(unknown, { wrote: WROTE, cards: CARDS, written: new Map(), shapes: new Map() }, STAMP)).toEqual([])
  })

  // A component carries no reading and a word often rests on the one its kanji gave, so the reading
  // columns are empty rather than absent: the row is still a card.
  it('leaves the reading columns empty where no reading story is written', () => {
    const bare = new Map([['休', { ...REST, reading: null, anchor: null, anchorPhonemes: null }]])
    const written = new Map([['休', told({ meaning: 'une histoire', nuance: 'la pause' })]])

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: bare, written, shapes: new Map() }, STAMP)[0]).toMatchObject({
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

    expect(rowsToPublish(KANJI, { wrote: WROTE, cards: CARDS, written, shapes: new Map() }, STAMP)[0]?.mnemonic).toBe('')
  })
})
