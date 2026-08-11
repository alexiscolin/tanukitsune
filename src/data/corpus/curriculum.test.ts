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

  // A radical sharing its shape with a kanji is named by that kanji's key. Asking the model for a
  // picture instead gives the same shape two French words, one on the radical card and one on the
  // kanji card, which is the contradiction docs/corpus.md refuses.
  it('owes nothing for a radical a kanji of the same shape already names', () => {
    const alsoKanji = subject({ id: 5, type: 'kanji', characters: '木' })

    expect(walkCurriculum([LEFT, RIGHT, alsoKanji, KANJI], { 亻: 'le passant' }, shapeOf).owed).toEqual([])
  })

  // Content the source has withdrawn is dealt by no session, so demanding a name for it would be
  // demanding one for a card nobody can be shown.
  it('reads nothing from a subject the source has withdrawn', () => {
    const { owed, read } = walkCurriculum([LEFT, RIGHT, { ...KANJI, hidden: true }], {}, shapeOf)

    expect(read).toEqual([])
    expect(owed).toEqual([])
  })

  // Fifteen of them carry no character, so there is no shape for a name to be taken from here and
  // they are reported rather than counted as owed.
  it('names a component the curriculum draws rather than writes', () => {
    const { drawn, owed } = walkCurriculum([subject({ id: 9, type: 'radical' })], {}, shapeOf)

    expect(drawn).toEqual(['radical#9'])
    expect(owed).toEqual([])
  })

  it('names a part the drawing does not place, character and part', () => {
    const unplaced = subject({ id: 4, type: 'radical', characters: '丶' })
    const walked = walkCurriculum([LEFT, RIGHT, unplaced, { ...KANJI, componentIds: [1, 2, 4] }], {}, shapeOf)

    expect(walked.unplaced).toEqual(['休:丶'])
  })
})
