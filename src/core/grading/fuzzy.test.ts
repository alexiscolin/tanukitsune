import { describe, expect, it } from 'vitest'

import { placesNearMiss } from './fuzzy'

const nothing: ReadonlySet<string> = new Set()

// A slip is placed only on a word the course itself answers with, so a reference a case exercises for
// a typo has to be one. Built per case from what it names, which keeps the rule and the fixture apart.
const taught = (...words: string[]): ReadonlySet<string> => new Set(words)

function meaning(answer: string, accepted: readonly [string, ...string[]], refused: readonly string[] = []) {
  return { kind: 'meaning' as const, answer, accepted, refused }
}

describe('placesNearMiss', () => {
  it('places a single mistyped letter, which is the answer the reader knew', () => {
    expect(placesNearMiss(meaning('philosphie', ['philosophie']), taught('philosophie'))).toBe(true)
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

  it('places a reflexive verb whose pronoun was typed and not written', () => {
    expect(placesNearMiss(meaning("s'appeler", ['appeler']), nothing)).toBe(true)
  })

  it('places against any reference the item allows, not the first alone', () => {
    expect(placesNearMiss(meaning('puissence', ['force', 'puissance']), taught('force', 'puissance'))).toBe(true)
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
    expect(placesNearMiss(meaning('bread', ['break'], ['bread']), taught('break'))).toBe(false)
  })

  it('refuses it however it was spelled, since the list is read the way an answer is', () => {
    expect(placesNearMiss(meaning('la Tâche', ['la tache'], ['la tache']), nothing)).toBe(false)
  })

  // What the course did not write is matched as it was written. The source's English and the reader's
  // own words have no neighbours anybody collected, so a slip on one could land on anything.
  it('places no slip on a word the course does not answer with', () => {
    expect(placesNearMiss(meaning('month', ['bouche', 'mouth']), taught('bouche'))).toBe(false)
  })

  it('still takes the source word written the way the reader wrote it', () => {
    expect(placesNearMiss(meaning('Mouth', ['bouche', 'mouth']), taught('bouche'))).toBe(true)
  })

  // The length floor belongs to the word that slipped, not to the phrase around it: six and dix are
  // as far apart inside dix minutes as they are alone.
  it('refuses a slip on a short word inside a phrase', () => {
    expect(placesNearMiss(meaning('six minutes', ['dix minutes']), taught('dix minutes'))).toBe(false)
  })

  it('refuses a slip that sits as near another answer as it does to this one', () => {
    expect(placesNearMiss(meaning('au-desous', ['au-dessus']), taught('au-dessus', 'au-dessous'))).toBe(false)
  })

  it('refuses a slipped word inside a phrase that is itself an answer', () => {
    const words = taught('au-dessus de la table', 'au-dessous')

    expect(placesNearMiss(meaning('au-dessous de la table', ['au-dessus de la table']), words)).toBe(false)
  })

  // An accent left out is a keyboard. An accent put in is a spelling, and élève is a different word
  // from élevé.
  it('refuses an accent the reader typed that the item does not write', () => {
    expect(placesNearMiss(meaning('élève', ['élevé']), taught('eleve'))).toBe(false)
  })

  it('reads a ligature and a curly apostrophe as the letters they stand for', () => {
    expect(placesNearMiss(meaning('cœur', ['coeur']), taught('coeur'))).toBe(true)
    expect(placesNearMiss(meaning('l’eau', ["l'eau"]), taught('eau'))).toBe(true)
  })

  // Only the words that carry no meaning of their own. Un is a count, de a relation: une fois is not
  // fois, and dû à is not à.
  it('keeps a numeral and a preposition at the front of the answer', () => {
    expect(placesNearMiss(meaning('fois', ['une fois']), taught('une fois'))).toBe(false)
    expect(placesNearMiss(meaning('a', ['dû à']), taught('du a'))).toBe(false)
  })

  it('refuses an empty answer, which is a reader giving up rather than missing a letter', () => {
    expect(placesNearMiss(meaning('', ['eau']), nothing)).toBe(false)
  })
})
