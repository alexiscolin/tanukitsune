import { describe, expect, it } from 'vitest'

import { flattened, nameOf, reusesItsCharacter, shownFirst } from './vocabulary'

describe('reusesItsCharacter', () => {
  it('reuses the word where the two mean the same thing', () => {
    expect(reusesItsCharacter(['One'], ['One'])).toBe(true)
    expect(reusesItsCharacter(['Water', 'Fluid'], ['Water'])).toBe(true)
  })

  // 天 the character is heaven and 天 the word is the heavens, so a card teaching the first for the
  // second teaches the wrong one.
  it('keeps its own where the two disagree', () => {
    expect(reusesItsCharacter(['Heavens', 'Firmament'], ['Heaven'])).toBe(false)
    expect(reusesItsCharacter(['About'], ['Promise'])).toBe(false)
  })

  it('reuses nothing where no character carries a word', () => {
    expect(reusesItsCharacter(['One'], undefined)).toBe(false)
  })
})

describe('nameOf', () => {
  it('reads a name off its own reading', () => {
    expect(nameOf(['Eito', 'Akito'], ['えいと', 'あきと'])).toEqual(['Eito', 'Akito'])
    expect(nameOf(['Rento'], ['れんと'])).toEqual(['Rento'])
  })

  // A word means something beyond the sound of it, so the reading says nothing about the meaning and
  // the release is what has to.
  it('gives nothing back where a meaning is more than the reading', () => {
    expect(nameOf(['University'], ['だいがく'])).toBeNull()
    expect(nameOf([], ['えいと'])).toBeNull()
  })
})

describe('shownFirst', () => {
  // 味噌 states the figurative sense before the paste, and a card showing the first asks for a word
  // nobody is taught.
  it('leads on the sense the course teaches', () => {
    expect(shownFirst(['idée principale', 'miso'], ['Miso'])).toEqual(['miso', 'idée principale'])
  })

  it('leaves the order alone where the first is already it, or where none of them is', () => {
    expect(shownFirst(['miso', 'idée principale'], ['Miso'])).toEqual(['miso', 'idée principale'])
    expect(shownFirst(['serviteur', 'samouraï'], ['Samurai'])).toEqual(['serviteur', 'samouraï'])
  })

  it('reads the accent French gives a borrowed word as the word the course teaches', () => {
    expect(shownFirst(['coup de pied', 'karaté'], ['Karate'])).toEqual(['karaté', 'coup de pied'])
  })
})

describe('flattened', () => {
  it('folds case and accent, so karate and karaté are one word', () => {
    expect(flattened('Karaté')).toBe(flattened('karate'))
  })
})
