import { describe, expect, it } from 'vitest'

import { faultInName } from './name'

describe('faultInName', () => {
  it('accepts a name shaped like the ones already written', () => {
    expect(faultInName('la bouche', '口')).toBeNull()
    expect(faultInName("l'arbre", '木')).toBeNull()
    expect(faultInName("le lit d'hôpital", '疒')).toBeNull()
  })

  // Twenty-five names carry an apostrophe and every one of them is the straight one, so the curly one
  // is refused rather than left to make the file two files.
  it('refuses the apostrophe the corpus does not use', () => {
    expect(faultInName('le lit d’hôpital', '疒')).toBe('not french')
  })

  // Every one of the 186 names already written opens on a definite article, and the article is what
  // makes a name a thing rather than a description: "bouche" is a body part, "la bouche" is the one
  // in the story.
  it('refuses a name that does not open on a definite article', () => {
    expect(faultInName('bouche', '口')).toBe('no article')
    expect(faultInName('une bouche', '口')).toBe('no article')
  })

  // A story names the part in a clause, so a name past three words is a description, and the reader
  // holding a list is the failure the whole method is built to avoid.
  it('refuses a name too long to sit inside a sentence', () => {
    expect(faultInName('le bec du petit canard', '嘴')).toBe('too long')
  })

  // A name that is the character says nothing a reader can picture, and it is what a model returns
  // when it has nothing.
  it('refuses a name that is the character it is meant to replace', () => {
    expect(faultInName('口', '口')).toBe('no article')
    expect(faultInName('le 口', '口')).toBe('not french')
  })

  it('refuses a name carrying anything that is not French', () => {
    expect(faultInName('le mouth', '口')).toBeNull()
    expect(faultInName('la ボックス', '口')).toBe('not french')
  })

  it('refuses an empty name rather than writing one', () => {
    expect(faultInName('', '口')).toBe('no article')
    expect(faultInName('   ', '口')).toBe('no article')
  })
})
