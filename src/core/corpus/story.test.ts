import { describe, expect, it } from 'vitest'

import { faultInStory } from './story'
import type { Story } from './story'

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
