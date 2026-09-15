import { describe, expect, it } from 'vitest'

import { placesNearMiss } from './fuzzy'

const nothing: ReadonlySet<string> = new Set()

function meaning(answer: string, accepted: readonly [string, ...string[]], refused: readonly string[] = []) {
  return { kind: 'meaning' as const, answer, accepted, refused }
}

describe('placesNearMiss', () => {
  it('places a single mistyped letter, which is the answer the reader knew', () => {
    expect(placesNearMiss(meaning('philosphie', ['philosophie']), nothing)).toBe(true)
  })

  it('places an answer typed without its accents, which no keyboard makes easy', () => {
    expect(placesNearMiss(meaning('reponse', ['réponse']), nothing)).toBe(true)
  })

  it('places an answer whose article is missing, and one that gained one', () => {
    expect(placesNearMiss(meaning('bouche', ['la bouche']), nothing)).toBe(true)
    expect(placesNearMiss(meaning('la bouche', ['bouche']), nothing)).toBe(true)
  })

  it('places a reflexive verb typed without its pronoun', () => {
    expect(placesNearMiss(meaning('appeler', ["s'appeler"]), nothing)).toBe(true)
  })

  it('places against any reference the item allows, not the first alone', () => {
    expect(placesNearMiss(meaning('puissence', ['force', 'puissance']), nothing)).toBe(true)
  })

  it('refuses a near miss that is the word the course teaches for something else', () => {
    const claimed = new Set(['nourriture'])

    expect(placesNearMiss(meaning('nourriture', ['pourriture']), claimed)).toBe(false)
  })

  // The criterion in docs/specs/v0.1.md, both halves of it. Where the item's own answer is the word,
  // the reader typed it and the accent is not what is being tested. Where a letter differs, the guard
  // decides, and no accent smuggles another card's word past it.
  it('accepts an unaccented spelling where the item allows it, claimed or not', () => {
    expect(placesNearMiss(meaning('tache', ['tâche']), new Set(['tache']))).toBe(true)
  })

  it('refuses a word the course answers another card with, however near this one it sits', () => {
    expect(placesNearMiss(meaning('poison', ['poisson']), new Set(['poison']))).toBe(false)
  })

  it('refuses a short reference outright, where one letter is a different word rather than a slip', () => {
    expect(placesNearMiss(meaning('six', ['dix']), nothing)).toBe(false)
  })

  it('refuses two mistyped letters, which is no longer a slip', () => {
    expect(placesNearMiss(meaning('philosphi', ['philosophie']), nothing)).toBe(false)
  })

  it('refuses an answer that shares nothing with the reference', () => {
    expect(placesNearMiss(meaning('feu', ['eau']), nothing)).toBe(false)
  })

  // The source sends the words it has decided are not the answer, and they are the ones that sit
  // closest to it. A tier that tolerates a slip would otherwise reach one and grade the mistake the
  // list exists to name.
  it('refuses a word the account has said is not the answer', () => {
    expect(placesNearMiss(meaning('bread', ['break'], ['bread']), nothing)).toBe(false)
  })

  it('refuses it however it was spelled, since the list is read the way an answer is', () => {
    expect(placesNearMiss(meaning('la Tâche', ['la tache'], ['la tache']), nothing)).toBe(false)
  })

  it('refuses an empty answer, which is a reader giving up rather than missing a letter', () => {
    expect(placesNearMiss(meaning('', ['eau']), nothing)).toBe(false)
  })
})
