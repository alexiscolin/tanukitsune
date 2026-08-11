import { describe, expect, it } from 'vitest'

import { acceptNames, faultInName } from './name'

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

describe('acceptNames', () => {
  const accept = (proposed: readonly { component: string; name: string }[], taken: Record<string, string> = {}) =>
    acceptNames(proposed, taken, FRENCH)

  it('keeps a name the shape allows and nothing else holds', () => {
    const { kept, refused } = accept([{ component: '囗', name: "l'enclos" }])

    expect(kept.get('囗')).toBe("l'enclos")
    expect(refused.size).toBe(0)
  })

  it('refuses a name on its shape, and says which fault', () => {
    const { kept, refused } = accept([
      { component: '囗', name: 'enclos' },
      { component: '厶', name: 'le coude du bras droit' },
    ])

    expect(kept.size).toBe(0)
    expect(refused.get('囗')).toBe('no article')
    expect(refused.get('厶')).toBe('too long')
  })

  // The whole value of naming a part is that the same part is called the same thing everywhere, and
  // its converse is that two parts are never called the same thing.
  it('refuses a name one of the components already written holds', () => {
    const { kept, refused } = accept([{ component: '囗', name: 'la bouche' }], { 口: 'la bouche' })

    expect(kept.size).toBe(0)
    expect(refused.get('囗')).toBe('name taken')
  })

  // Every request in a batch leaves with the same list of taken names, so two of them can come back
  // with the same one and no single request could have known. The lot is where that is caught, and
  // the order it arrives in is the order that decides, which is why the proposals are a list.
  it('gives a name proposed twice in one lot to the first component only', () => {
    const { kept, refused } = accept([
      { component: '囗', name: "l'enclos" },
      { component: '⺆', name: "l'enclos" },
    ])

    expect(kept.get('囗')).toBe("l'enclos")
    expect(kept.has('⺆')).toBe(false)
    expect(refused.get('⺆')).toBe('name taken')
  })

  // A batch outlives the file it was asked against: the reader names a component by hand while it
  // runs, and the answer arrives for a component that has a name. Renaming it is the one thing a rule
  // reading "one name per component" cannot do, and the hand-written name is the one worth keeping.
  it('refuses a name for a component that already has one', () => {
    const { kept, refused } = accept([{ component: '口', name: "l'ouverture" }], { 口: 'la bouche' })

    expect(kept.size).toBe(0)
    expect(refused.get('口')).toBe('already named')
  })

  // Two names are the same name whatever their case, so the comparison folds. What is written back
  // does not: a locale whose nouns carry a capital says so in its letters, and folding here would be
  // that locale needing a branch in an engine that promises none.
  it('compares two names folded and writes back what the locale wrote', () => {
    const { kept, refused } = accept([
      { component: '囗', name: '  la bouche ' },
      { component: '⺆', name: 'La Bouche' },
    ])

    expect(kept.get('囗')).toBe('la bouche')
    expect(refused.get('⺆')).toBe('name taken')
  })
})

// The engine's claim is that a second language is a folder and no code, and nothing proves it while
// every case it is run against comes from one folder. The same rule is run against a second shape
// here. German capitalises its nouns and opens on three articles, both of which are its material.
describe('acceptNames, under another locale', () => {
  const GERMAN = {
    opensWith: ['der ', 'die ', 'das '],
    letters: 'abcdefghijklmnopqrstuvwxyzäöüßABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ',
    joiners: '- ',
    mostWords: 2,
  }

  it('keeps the capital its nouns carry', () => {
    const { kept } = acceptNames([{ component: '口', name: 'der Mund' }], {}, GERMAN)

    expect(kept.get('口')).toBe('der Mund')
  })

  it('refuses what opens on the article of another locale', () => {
    const { refused } = acceptNames([{ component: '口', name: 'la bouche' }], {}, GERMAN)

    expect(refused.get('口')).toBe('no article')
  })
})
