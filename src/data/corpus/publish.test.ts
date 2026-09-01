import { describe, expect, it } from 'vitest'

import { rowsToPublish } from './publish'
import type { Publishable } from './publish'

const REST: Publishable = {
  subjectId: '451',
  key: 'repos',
  englishKey: 'Rest',
  parts: ['le passant', "l'arbre"],
  reading: 'キュウ',
  anchor: 'le képi',
  anchorPhonemes: ['k', 'e', 'p', 'i'],
}

const STAMP = { locale: 'fr', writtenBy: 'hand', promptVersion: '', corpusVersion: '9a1c2f0e' }

const told = (one: Partial<{ meaning: string; reading: string; nuance: string }>) => ({
  meaning: '',
  reading: '',
  nuance: '',
  ...one,
})

describe('rowsToPublish', () => {
  it('writes what a card shows and what a check reads', () => {
    const written = new Map([['休', told({ meaning: 'une histoire', reading: 'une autre', nuance: 'la pause' })]])

    expect(rowsToPublish(new Map([['休', REST]]), written, STAMP)).toEqual([
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

  // A card the table cannot fill is left out rather than written half: the columns a row must carry
  // are the ones a reader is shown, and a row with an empty one is a card that shows nothing.
  it('leaves out a card with no story', () => {
    const written = new Map([['休', told({ nuance: 'la pause' })]])

    expect(rowsToPublish(new Map([['休', REST]]), written, STAMP)).toEqual([])
  })

  it('leaves out a card with no nuance', () => {
    const written = new Map([['休', told({ meaning: 'une histoire' })]])

    expect(rowsToPublish(new Map([['休', REST]]), written, STAMP)).toEqual([])
  })

  // A component carries no reading and a word often rests on the one its kanji gave, so the reading
  // columns are empty rather than absent: the row is still a card.
  it('leaves the reading columns empty where no reading story is written', () => {
    const bare = new Map([['休', { ...REST, reading: null, anchor: null, anchorPhonemes: null }]])
    const written = new Map([['休', told({ meaning: 'une histoire', nuance: 'la pause' })]])

    expect(rowsToPublish(bare, written, STAMP)[0]).toMatchObject({
      readingMnemonic: null,
      reading: null,
      anchor: null,
      anchorPhonemes: null,
    })
  })

  // A story written for a character no card deals is not a row: the report already names it, and
  // writing it would put a card in the table nobody can be dealt.
  it('writes nothing for a story with no card behind it', () => {
    const written = new Map([['姉', told({ meaning: 'une histoire', nuance: 'la soeur' })]])

    expect(rowsToPublish(new Map([['休', REST]]), written, STAMP)).toEqual([])
  })
})
