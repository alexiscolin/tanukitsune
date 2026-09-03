import { describe, expect, it } from 'vitest'

import { faultsInStories } from './story-run'
import type { Card, Told } from './story-run'

const TELLING = {
  opensWith: ['le ', 'la ', 'les ', "l'"],
  letters: 'abcdefghijklmnopqrstuvwxyzàâäçéèêëîïòôöùûüÿœæ',
  inflects: ['s', 'x'],
}

const REST: Card = { parts: ['le passant', "l'arbre"], key: 'repos', anchor: 'le képi', reading: 'キュウ' }

const told = (one: Partial<Told>): Told => ({ meaning: '', nuance: '', reading: '', ...one })

const cards = new Map([['休', REST]])

describe('faultsInStories', () => {
  it('says nothing where both stories hold', () => {
    const written = new Map([
      [
        '休',
        told({
          meaning: "le passant s'adosse à l'arbre et trouve enfin le repos",
          reading: "le képi du passant tombe de l'arbre en criant キュウ",
        }),
      ],
    ])

    expect(faultsInStories(written, cards, TELLING)).toEqual([])
  })

  // Both stories are judged, and the fault names which of the two carries it: a run reporting one line
  // per character leaves the reader opening the file to find out which half is wrong.
  it('names the story a fault sits in', () => {
    const written = new Map([
      ['休', told({ meaning: 'le passant dort', reading: "le képi du passant crie キュウ" })],
    ])

    expect(faultsInStories(written, cards, TELLING)).toEqual(["休 meaning: names nothing for l'arbre"])
  })

  it('judges the reading story on the scene the meaning story built', () => {
    const written = new Map([
      [
        '休',
        told({
          meaning: "le passant s'adosse à l'arbre et trouve enfin le repos",
          reading: 'le képi roule sur le quai en criant キュウ',
        }),
      ],
    ])

    expect(faultsInStories(written, cards, TELLING)).toEqual([
      '休 reading: continues nothing the meaning story built',
    ])
  })

  // A story written for a character no card deals is a story nobody will ever be shown, and it is the
  // one fault the rules themselves cannot see.
  it('refuses a story written for a character the curriculum does not deal', () => {
    const written = new Map([['姉', told({ meaning: 'la grande soeur', reading: 'シ' })]])

    expect(faultsInStories(written, cards, TELLING)).toEqual(['姉 is not a card this curriculum deals'])
  })

  // A card whose reading was never bound to a word cannot carry a reading story, so one written for it
  // rests on nothing.
  it('refuses a reading story where the reading carries no anchor', () => {
    const bare = new Map([['休', { ...REST, anchor: null }]])
    const written = new Map([
      [
        '休',
        told({
          meaning: "le passant s'adosse à l'arbre et trouve enfin le repos",
          reading: 'le képi crie キュウ',
        }),
      ],
    ])

    expect(faultsInStories(written, bare, TELLING)).toEqual(['休 reading: no anchor binds this reading yet'])
  })

  it('accepts a card left with no reading story where nothing binds its reading', () => {
    const bare = new Map([['休', { ...REST, anchor: null }]])
    const written = new Map([
      ['休', told({ meaning: "le passant s'adosse à l'arbre et trouve enfin le repos" })],
    ])

    expect(faultsInStories(written, bare, TELLING)).toEqual([])
  })
})
