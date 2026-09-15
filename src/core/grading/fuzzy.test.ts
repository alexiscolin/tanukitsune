import { describe, expect, it } from 'vitest'

import { fuzzyVerdict } from './fuzzy'

const nothing: ReadonlySet<string> = new Set()

function meaning(answer: string, accepted: readonly [string, ...string[]], refused: readonly string[] = []) {
  return { kind: 'meaning' as const, answer, accepted, refused }
}

describe('fuzzyVerdict', () => {
  it('places a single mistyped letter, which is the answer the reader knew', () => {
    expect(fuzzyVerdict(meaning('philosphie', ['philosophie']), nothing)).toBe('correct')
  })

  it('places an answer typed without its accents, which no keyboard makes easy', () => {
    expect(fuzzyVerdict(meaning('reponse', ['réponse']), nothing)).toBe('correct')
  })

  it('places an answer whose article is missing, and one that gained one', () => {
    expect(fuzzyVerdict(meaning('bouche', ['la bouche']), nothing)).toBe('correct')
    expect(fuzzyVerdict(meaning('la bouche', ['bouche']), nothing)).toBe('correct')
  })

  it('places a reflexive verb typed without its pronoun', () => {
    expect(fuzzyVerdict(meaning('appeler', ["s'appeler"]), nothing)).toBe('correct')
  })

  it('places against any reference the item allows, not the first alone', () => {
    expect(fuzzyVerdict(meaning('puissence', ['force', 'puissance']), nothing)).toBe('correct')
  })

  it('refuses a near miss that is the word the course teaches for something else', () => {
    const claimed = new Set(['nourriture'])

    expect(fuzzyVerdict(meaning('nourriture', ['pourriture']), claimed)).toBeNull()
  })

  // The criterion in docs/specs/v0.1.md, both halves of it. Where the item's own answer is the word,
  // the reader typed it and the accent is not what is being tested. Where a letter differs, the guard
  // decides, and no accent smuggles another card's word past it.
  it('accepts an unaccented spelling where the item allows it, claimed or not', () => {
    expect(fuzzyVerdict(meaning('tache', ['tâche']), new Set(['tache']))).toBe('correct')
  })

  it('refuses a word the course answers another card with, however near this one it sits', () => {
    expect(fuzzyVerdict(meaning('poison', ['poisson']), new Set(['poison']))).toBeNull()
  })

  it('refuses a short reference outright, where one letter is a different word rather than a slip', () => {
    expect(fuzzyVerdict(meaning('six', ['dix']), nothing)).toBeNull()
  })

  it('refuses two mistyped letters, which is no longer a slip', () => {
    expect(fuzzyVerdict(meaning('philosphi', ['philosophie']), nothing)).toBeNull()
  })

  it('refuses an answer that shares nothing with the reference', () => {
    expect(fuzzyVerdict(meaning('feu', ['eau']), nothing)).toBeNull()
  })

  // The source sends the words it has decided are not the answer, and they are the ones that sit
  // closest to it. A tier that tolerates a slip would otherwise reach one and grade the mistake the
  // list exists to name.
  it('refuses a word the account has said is not the answer', () => {
    expect(fuzzyVerdict(meaning('bread', ['break'], ['bread']), nothing)).toBeNull()
  })

  it('refuses it however it was spelled, since the list is read the way an answer is', () => {
    expect(fuzzyVerdict(meaning('la Tâche', ['la tache'], ['la tache']), nothing)).toBeNull()
  })

  it('refuses an empty answer, which is a reader giving up rather than missing a letter', () => {
    expect(fuzzyVerdict(meaning('', ['eau']), nothing)).toBeNull()
  })
})
