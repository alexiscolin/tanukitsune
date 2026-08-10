import { describe, expect, it } from 'vitest'

import { faultInName } from './name'

// The French shape, which is material rather than a rule: another language brings its own file and
// this engine does not change.
const FRENCH = {
  opensWith: ['le ', 'la ', 'les ', "l'"],
  letters: 'abcdefghijklmnopqrstuvwxyzàâäçéèêëîïòôöùûüÿœæ',
  joiners: "' -",
  mostWords: 2,
}

const fault = (name: string) => faultInName(name, FRENCH)

describe('faultInName', () => {
  it('accepts a name shaped like the ones already written', () => {
    expect(fault('la bouche')).toBeNull()
    expect(fault("l'arbre")).toBeNull()
    expect(fault("le lit d'hôpital")).toBeNull()
  })

  // Every one of the 186 names already written opens on a definite article, and the article is what
  // makes a name a thing rather than a description: "bouche" is a body part, "la bouche" is the one
  // in the story.
  it('refuses a name that does not open on a definite article', () => {
    expect(fault('bouche')).toBe('no article')
    expect(fault('une bouche')).toBe('no article')
    expect(fault('')).toBe('no article')
    expect(fault('   ')).toBe('no article')
  })

  // An article and nothing after it is what a model returns when it has nothing, and it reads as a
  // name until somebody opens the file.
  it('refuses an article standing on its own', () => {
    expect(fault("l'")).toBe('nothing after the article')
    expect(fault('le ')).toBe('no article')
    expect(fault('le -')).toBe('nothing after the article')
    expect(fault("l'--")).toBe('nothing after the article')
  })

  // A story names the part in a clause, so a name past three words is a description, and the reader
  // holding a list is the failure the whole method is built to avoid.
  // Counted after the article, so le and l' bound the same number of words rather than one apiece.
  it('refuses a name too long to sit inside a sentence, whichever article opens it', () => {
    expect(fault('le bec du canard')).toBe('too long')
    expect(fault("l'os du poignet")).toBe('too long')
    expect(fault('la main droite')).toBeNull()
    expect(fault("l'arbre mort")).toBeNull()
  })

  it('refuses a name carrying what the locale does not write', () => {
    expect(fault('la ボックス')).toBe('not the locale')
    expect(fault('le mouth')).toBeNull()
  })

  // Twenty-five names carry an apostrophe and every one of them is the straight one, so the curly one
  // is refused rather than left to make the file two files.
  it('refuses the apostrophe the locale does not use', () => {
    expect(fault('le lit d’hôpital')).toBe('not the locale')
  })

  // Nineteen components carry no character, so there is nothing for a name to be equal to, and a
  // check comparing against an empty string refuses every name there is.
  it('judges a name for a component the curriculum draws rather than writes', () => {
    expect(fault('la péniche')).toBeNull()
  })
})
