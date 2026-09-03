import { describe, expect, it } from 'vitest'

import { faultInReadingStory, faultInStory } from './story'
import type { ReadingStory, Story, Telling } from './story'

// What French says about its own names: what one opens on, what its letters are, and what prose may add
// to the end of one and still be saying it.
const TELLING: Telling = {
  opensWith: ['le ', 'la ', 'les ', "l'"],
  letters: 'abcdefghijklmnopqrstuvwxyzàâäçéèêëîïòôöùûüÿœæ',
  inflects: ['s', 'x'],
}

// 休 as the reader meets it: a passer-by beside a tree, and the character means rest.
const story = (one: Partial<Story> & Pick<Story, 'text'>): Story => ({
  parts: ['le passant', "l'arbre"],
  key: 'repos',
  ...one,
})

describe('faultInStory', () => {
  it('accepts a story naming every part in order and ending on the key', () => {
    const told = story({ text: "le passant s'adosse à l'arbre et trouve enfin le repos" })

    expect(faultInStory(told, TELLING)).toBeNull()
  })

  // A story is read as the character is drawn, so a part it skips is a part the reader is never told
  // is there, and the drawing is what says the part is there at all.
  it('refuses a story that leaves a part unnamed', () => {
    const told = story({ text: "le passant marche jusqu'au repos" })

    expect(faultInStory(told, TELLING)).toBe("names nothing for l'arbre")
  })

  // The order is the order the drawing places them, which is the order the reader's eye takes and the
  // only order that makes the story a way to write the character rather than a list of its pieces.
  it('refuses a story naming the parts out of the order they are drawn in', () => {
    const told = story({ text: "l'arbre abrite le passant, qui y trouve le repos" })

    expect(faultInStory(told, TELLING)).toBe("names l'arbre before le passant")
  })

  // The key is the answer the card asks for, so a story ending anywhere else ends on something the
  // reader was not asked to recall.
  it('refuses a story that does not end on the key', () => {
    const told = story({ text: "le repos du passant est à l'arbre" })

    expect(faultInStory(told, TELLING)).toBe('ends on something other than repos')
  })

  it('refuses a story that never names the key', () => {
    const told = story({ text: "le passant s'adosse à l'arbre" })

    expect(faultInStory(told, TELLING)).toBe('names nothing for repos')
  })

  it('refuses a story with nothing in it', () => {
    expect(faultInStory(story({ text: '   ' }), TELLING)).toBe('no story at all')
  })
})

// The same character, asked for its sound: the scene the meaning story built continues, opening on the
// word the reading is bound to and arriving at the reading itself.
const heard = (one: Partial<ReadingStory> & Pick<ReadingStory, 'text'>): ReadingStory => ({
  anchor: 'le képi',
  reading: 'キュウ',
  cast: ['le passant', "l'arbre", 'repos'],
  ...one,
})

describe('faultInReadingStory', () => {
  it('accepts a story opening on the anchor, keeping the cast and ending on the reading', () => {
    const told = heard({ text: "le képi du passant tombe de l'arbre en criant キュウ" })

    expect(faultInReadingStory(told, TELLING)).toBeNull()
  })

  // The acoustic link of the keyword method attaches at the front, so a story reaching the anchor
  // after the scene has started has put the link where the reader is no longer listening for it.
  it('refuses a story naming the scene before the anchor', () => {
    const told = heard({ text: "le passant pose le képi et dit キュウ" })

    expect(faultInReadingStory(told, TELLING)).toBe('names le passant before the anchor')
  })

  it('refuses a story that never names the anchor', () => {
    const told = heard({ text: "le passant dort sous l'arbre en disant キュウ" })

    expect(faultInReadingStory(told, TELLING)).toBe('names nothing for le képi')
  })

  // The item is asked from the character to its sound, so the story is told in that direction. Told
  // backwards it rehearses a recall the card never asks for.
  it('refuses a story running from the reading to the anchor', () => {
    const told = heard({ text: "キュウ, crie le képi du passant" })

    expect(faultInReadingStory(told, TELLING)).toBe('runs from the reading to the anchor')
  })

  it('refuses a story that never names the reading', () => {
    const told = heard({ text: "le képi du passant tombe de l'arbre" })

    expect(faultInReadingStory(told, TELLING)).toBe('names nothing for キュウ')
  })

  // One scene carries both answers, which is the whole reason the reading story is not written on its
  // own: a scene sharing no one with the meaning story is a second thing to remember.
  it('refuses a story continuing no scene', () => {
    const told = heard({ text: 'le képi roule sur le quai en criant キュウ' })

    expect(faultInReadingStory(told, TELLING)).toBe('continues nothing the meaning story built')
  })

  it('refuses a story with nothing in it', () => {
    expect(faultInReadingStory(heard({ text: '  ' }), TELLING)).toBe('no story at all')
  })
})

// The names a locale actually wrote are short and sit inside longer words: le sol is inside soleil, le
// pas inside the negation, la main inside maintenant. A rule reading the text as a bag of letters
// passes every story that never names anything.
describe('faultInStory, against the names a locale really wrote', () => {
  const ground = (text: string): Story => ({ text, parts: ['le sol'], key: 'repos' })

  it('does not take a longer word for the name inside it', () => {
    expect(faultInStory(ground('le soleil tombe sur le repos'), TELLING)).toBe('names nothing for le sol')
  })

  it('takes the name where the prose inflects it', () => {
    expect(faultInStory({ ...ground(''), text: 'les sols mènent au repos' }, TELLING)).toBeNull()
  })

  // Two names where one is written inside the other: naming the longer one has named it and not the
  // shorter, or a character drawing both parts passes on one mention.
  it('does not let one mention answer for two parts', () => {
    const told: Story = {
      text: 'la main droite trouve le repos',
      parts: ['la main', 'la main droite'],
      key: 'repos',
    }

    expect(faultInStory(told, TELLING)).toBe('names nothing for la main')
  })

  // A name claims the words it was found in, and its article is not one of them: the article belongs
  // to the name as written, never to the prose, so counting it stretches the claim over the word after.
  it('lets the next part be the word right after a name written with an article', () => {
    const told: Story = {
      text: 'le battement, cinq et la bouche, et tout devient clair: repos',
      parts: ['le battement', 'cinq', 'la bouche'],
      key: 'repos',
    }

    expect(faultInStory(told, TELLING)).toBeNull()
  })

  // The key of 一 is un, and French prose is full of un, une and aucun. Only the first is the key.
  it('does not take an article for a key that is one', () => {
    const told: Story = { text: "une pierre pose l'arbre", parts: ["l'arbre"], key: 'un' }

    expect(faultInStory(told, TELLING)).toBe('names nothing for un')
  })

  // Ends on the key, which is what the card asks for: a story naming a part after it ends on the part.
  it('refuses a story naming a part after the key', () => {
    const told: Story = { text: "le repos vient, puis l'arbre repart", parts: ["l'arbre"], key: 'repos' }

    expect(faultInStory(told, TELLING)).toBe('ends on something other than repos')
  })
})
