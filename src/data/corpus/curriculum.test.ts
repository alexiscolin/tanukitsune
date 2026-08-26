import { describe, expect, it } from 'vitest'

import type { Glyph } from '@/core/corpus/decomposition'
import type { InventorySubject } from '@/data/corpus/inventory'

import { walkCurriculum } from './curriculum'

const subject = (one: Partial<InventorySubject> & Pick<InventorySubject, 'id' | 'type'>): InventorySubject => ({
  level: 1,
  characters: null,
  hidden: false,
  meanings: [],
  readings: [],
  componentIds: [],
  ...one,
})

const glyph = (component: string, position: string | null): Glyph => ({ component, position, parts: [] })

// 休 as the curriculum deals it: two radicals it has dealt cards for, and the drawing placing both.
const LEFT = subject({ id: 1, type: 'radical', characters: '亻' })
const RIGHT = subject({ id: 2, type: 'radical', characters: '木' })
const KANJI = subject({ id: 3, type: 'kanji', characters: '休', componentIds: [1, 2] })

const shapeOf = (character: string) =>
  character === '休' ? [glyph('亻', 'left'), glyph('木', 'right')] : []

describe('walkCurriculum', () => {
  it('owes a name for a radical the locale has not named', () => {
    const { owed } = walkCurriculum([LEFT, RIGHT, KANJI], { 亻: 'le passant' }, shapeOf)

    expect(owed).toEqual(['木'])
  })

  // A part that is itself a subject with a key of its own is named by what it means, so a component
  // that is a kanji owes nothing even where no name covers it.
  it('owes nothing for a part the curriculum teaches as a kanji', () => {
    const asKanji = subject({ id: 2, type: 'kanji', characters: '木' })

    expect(walkCurriculum([LEFT, asKanji, KANJI], { 亻: 'le passant' }, shapeOf).owed).toEqual([])
  })

  // A radical sharing its shape with a kanji and taught under the same meaning is named by that kanji's
  // key. Asking the model for a picture instead gives the same shape two French words, one on the
  // radical card and one on the kanji card, which is the contradiction docs/corpus.md refuses.
  it('owes nothing for a radical a kanji of the same shape already names', () => {
    const alsoKanji = subject({ id: 5, type: 'kanji', characters: '木' })

    expect(walkCurriculum([LEFT, RIGHT, alsoKanji, KANJI], { 亻: 'le passant' }, shapeOf).owed).toEqual([])
  })

  // A radical the curriculum teaches under a meaning of its own is a card of its own, dealt a median of
  // thirteen levels before its kanji and answered on a different word. 母 is a chest of drawers seen as
  // a shape and a mother read as a character: named by the kanji, its card shows the reader a word for
  // something the shape does not look like, which is what the naming rule refuses.
  it('owes a name where the radical is taught under a meaning its kanji does not carry', () => {
    const drawer = subject({ id: 2, type: 'radical', characters: '母', meanings: ['Drawer'] })
    const mother = subject({ id: 5, type: 'kanji', characters: '母', meanings: ['Mother'] })
    const built = subject({ id: 3, type: 'kanji', characters: '毎', componentIds: [1, 2] })

    expect(walkCurriculum([LEFT, drawer, mother, built], { 亻: 'le passant' }, shapeOf).owed).toEqual(['母'])
  })

  // The same shape under the same word is one card said twice, and naming it again would teach that
  // shape two French words, one on each card.
  it('owes nothing where the radical and its kanji are taught under one meaning', () => {
    const tree = subject({ id: 2, type: 'radical', characters: '木', meanings: ['Tree'] })
    const asKanji = subject({ id: 5, type: 'kanji', characters: '木', meanings: ['Tree', 'Wood'] })

    expect(walkCurriculum([LEFT, tree, asKanji, KANJI], { 亻: 'le passant' }, shapeOf).owed).toEqual([])
  })

  // The word they share need not be the first either side states: the curriculum lists what it accepts
  // and not what it teaches first, so 羽 states Feathers where its kanji states Feather, Feathers, Wing.
  // Read on the first word alone, four shapes with a key already got a second French word.
  it('owes nothing where they share a word neither states first', () => {
    const feathers = subject({ id: 2, type: 'radical', characters: '羽', meanings: ['Feathers'] })
    const asKanji = subject({ id: 5, type: 'kanji', characters: '羽', meanings: ['Feather', 'Feathers', 'Wing'] })
    const built = subject({ id: 3, type: 'kanji', characters: '習', componentIds: [1, 2] })

    expect(walkCurriculum([LEFT, feathers, asKanji, built], { 亻: 'le passant' }, shapeOf).owed).toEqual([])
  })

  // A radical the source has withdrawn is dealt by no session, so a name for it is a name for a card
  // nobody can be shown, and the reason the rule gives, that it is dealt before its kanji, is not true
  // of a card that is dealt at all.
  it('owes nothing for a radical the source has withdrawn', () => {
    const gone = subject({ id: 2, type: 'radical', characters: '母', meanings: ['Drawer'], hidden: true })
    const mother = subject({ id: 5, type: 'kanji', characters: '母', meanings: ['Mother'] })
    const built = subject({ id: 3, type: 'kanji', characters: '毎', componentIds: [1, 2] })

    expect(walkCurriculum([LEFT, gone, mother, built], { 亻: 'le passant' }, shapeOf).owed).toEqual([])
  })

  // The other half of the same rule: a kanji nobody can be shown teaches no key, so it cannot be what
  // names the radical either, and the radical is owed a name of its own again.
  it('owes a name where the kanji of that shape is withdrawn', () => {
    const withdrawn = subject({ id: 5, type: 'kanji', characters: '木', hidden: true })

    expect(walkCurriculum([LEFT, RIGHT, withdrawn, KANJI], { 亻: 'le passant' }, shapeOf).owed).toEqual(['木'])
  })

  // Content the source has withdrawn is dealt by no session, so demanding a name for it would be
  // demanding one for a card nobody can be shown.
  it('reads nothing from a subject the source has withdrawn', () => {
    const { owed, read } = walkCurriculum([LEFT, RIGHT, { ...KANJI, hidden: true }], {}, shapeOf)

    expect(read).toEqual([])
    expect(owed).toEqual([])
  })

  it('names a component the curriculum draws rather than writes, and owes it a name', () => {
    const { drawn, owed } = walkCurriculum([subject({ id: 9, type: 'radical' })], {}, shapeOf)

    expect(drawn).toEqual(['radical#9'])
    expect(owed).toEqual(['radical#9'])
  })

  it('owes nothing for a drawn component the locale has named', () => {
    const walked = walkCurriculum([subject({ id: 9, type: 'radical' })], { 'radical#9': 'la barque' }, shapeOf)

    expect(walked.drawn).toEqual(['radical#9'])
    expect(walked.owed).toEqual([])
  })

  it('names a part the drawing does not place, character and part', () => {
    const unplaced = subject({ id: 4, type: 'radical', characters: '丶' })
    const walked = walkCurriculum([LEFT, RIGHT, unplaced, { ...KANJI, componentIds: [1, 2, 4] }], {}, shapeOf)

    expect(walked.unplaced).toEqual(['休:丶'])
  })
})
