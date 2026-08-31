import { describe, expect, it } from 'vitest'

import { faultInReadingStory, faultInStory } from './story'
import type { ReadingStory, Story } from './story'

// 休 as the reader meets it: a passer-by beside a tree, and the character means rest.
const story = (one: Partial<Story> & Pick<Story, 'text'>): Story => ({
  parts: ['le passant', "l'arbre"],
  key: 'repos',
  opensWith: ['le ', 'la ', 'les ', "l'"],
  ...one,
})

describe('faultInStory', () => {
  it('accepts a story naming every part in order and ending on the key', () => {
    const told = story({ text: "le passant s'adosse à l'arbre et trouve enfin le repos" })

    expect(faultInStory(told)).toBeNull()
  })

  // A story is read as the character is drawn, so a part it skips is a part the reader is never told
  // is there, and the drawing is what says the part is there at all.
  it('refuses a story that leaves a part unnamed', () => {
    const told = story({ text: "le passant marche jusqu'au repos" })

    expect(faultInStory(told)).toBe("names nothing for l'arbre")
  })

  // The order is the order the drawing places them, which is the order the reader's eye takes and the
  // only order that makes the story a way to write the character rather than a list of its pieces.
  it('refuses a story naming the parts out of the order they are drawn in', () => {
    const told = story({ text: "l'arbre abrite le passant, qui y trouve le repos" })

    expect(faultInStory(told)).toBe("names l'arbre before le passant")
  })

  // The key is the answer the card asks for, so a story ending anywhere else ends on something the
  // reader was not asked to recall.
  it('refuses a story that does not end on the key', () => {
    const told = story({ text: "le repos du passant est à l'arbre" })

    expect(faultInStory(told)).toBe('ends on something other than repos')
  })

  it('refuses a story that never names the key', () => {
    const told = story({ text: "le passant s'adosse à l'arbre" })

    expect(faultInStory(told)).toBe('names nothing for repos')
  })

  it('refuses a story with nothing in it', () => {
    expect(faultInStory(story({ text: '   ' }))).toBe('no story at all')
  })
})

// The same character, asked for its sound: the scene the meaning story built continues, opening on the
// word the reading is bound to and arriving at the reading itself.
const heard = (one: Partial<ReadingStory> & Pick<ReadingStory, 'text'>): ReadingStory => ({
  anchor: 'le képi',
  reading: 'キュウ',
  cast: ['le passant', "l'arbre", 'repos'],
  opensWith: ['le ', 'la ', 'les ', "l'"],
  ...one,
})

describe('faultInReadingStory', () => {
  it('accepts a story opening on the anchor, keeping the cast and ending on the reading', () => {
    const told = heard({ text: "le képi du passant tombe de l'arbre en criant キュウ" })

    expect(faultInReadingStory(told)).toBeNull()
  })

  // The acoustic link of the keyword method attaches at the front, so a story reaching the anchor
  // after the scene has started has put the link where the reader is no longer listening for it.
  it('refuses a story naming the scene before the anchor', () => {
    const told = heard({ text: "le passant pose le képi et dit キュウ" })

    expect(faultInReadingStory(told)).toBe('names le passant before the anchor')
  })

  it('refuses a story that never names the anchor', () => {
    const told = heard({ text: "le passant dort sous l'arbre en disant キュウ" })

    expect(faultInReadingStory(told)).toBe('names nothing for le képi')
  })

  // The item is asked from the character to its sound, so the story is told in that direction. Told
  // backwards it rehearses a recall the card never asks for.
  it('refuses a story running from the reading to the anchor', () => {
    const told = heard({ text: "キュウ, crie le képi du passant" })

    expect(faultInReadingStory(told)).toBe('runs from the reading to the anchor')
  })

  it('refuses a story that never names the reading', () => {
    const told = heard({ text: "le képi du passant tombe de l'arbre" })

    expect(faultInReadingStory(told)).toBe('names nothing for キュウ')
  })

  // One scene carries both answers, which is the whole reason the reading story is not written on its
  // own: a scene sharing no one with the meaning story is a second thing to remember.
  it('refuses a story continuing no scene', () => {
    const told = heard({ text: 'le képi roule sur le quai en criant キュウ' })

    expect(faultInReadingStory(told)).toBe('continues nothing the meaning story built')
  })

  it('refuses a story with nothing in it', () => {
    expect(faultInReadingStory(heard({ text: '  ' }))).toBe('no story at all')
  })
})
