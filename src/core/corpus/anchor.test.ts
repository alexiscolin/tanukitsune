import { describe, expect, it } from 'vitest'

import { agreesAtTheStart, distanceBetween, impossibleOnset } from './anchor'
import { phonemesOf } from './phonetics'

// French as a lexicon gives it, never as spelling gives it: hôtel starts on a vowel, and that is the
// whole reason the h row is where French anchors go wrong.
const HOTEL = ['o', 't', 'ɛ', 'l']
const COL = ['k', 'ɔ', 'l']
const CAR = ['k', 'a', 'ʁ']
const SUR = ['s', 'y', 'ʁ']

describe('agreesAtTheStart', () => {
  // The acoustic link of the keyword method attaches at the beginning of the word. A match landing
  // only on the tail is not a keyword, it is a coincidence.
  it('holds when the first sound and the first vowel are the same', () => {
    expect(agreesAtTheStart(phonemesOf('こう'), COL)).toBe(true)
  })

  it('fails when the first consonant differs', () => {
    expect(agreesAtTheStart(phonemesOf('こう'), ['t', 'ɔ'])).toBe(false)
  })

  it('fails when the first vowel differs', () => {
    expect(agreesAtTheStart(phonemesOf('こう'), CAR)).toBe(false)
  })
})

describe('impossibleOnset', () => {
  // Which sounds a language cannot begin with comes from that language's own material, so the rule
  // reads the same for German the day German arrives. These are French's.
  const FRENCH = ['h', 'ɸ', 'ts', 'tɕ']

  // The failure this whole file exists for: French has no /h/, so hôtel is said without one and an
  // anchor claiming it sounds like は is claiming a sound its own language cannot make.
  it('names the sound the language cannot make when an anchor claims it', () => {
    expect(impossibleOnset(phonemesOf('は'), HOTEL, FRENCH)).toBe('h')
  })

  it('names it for the affricate French has no onset for', () => {
    expect(impossibleOnset(phonemesOf('つ'), SUR, FRENCH)).toBe('ts')
  })

  it('says nothing when the anchor really carries the sound', () => {
    expect(impossibleOnset(phonemesOf('か'), CAR, FRENCH)).toBe(null)
  })

  // A language that can begin with it has nothing to answer for, which is what makes the rule the
  // engine's and the list the locale's.
  it('says nothing when the language can begin with that sound', () => {
    expect(impossibleOnset(phonemesOf('は'), HOTEL, [])).toBe(null)
  })
})

describe('distanceBetween', () => {
  it('is nothing between a sequence and itself', () => {
    expect(distanceBetween(CAR, CAR)).toBe(0)
  })

  // Voicing is one feature, so これ against gore is a near miss rather than a different word, and a
  // threshold that treats it like one would refuse every usable anchor in the language.
  it('is small between sounds that differ by one feature', () => {
    expect(distanceBetween(['k', 'a'], ['g', 'a'])).toBeLessThan(0.3)
  })

  it('is large between sounds that share nothing', () => {
    expect(distanceBetween(['k', 'a'], ['m', 'i'])).toBeGreaterThan(0.5)
  })

  // Length is contrastive in Japanese and absent in French, so the count has to be paid for
  // somewhere. It is paid here: ちょう against ちょ is a real difference, not a rounding.
  it('charges for a sound that is there on one side only', () => {
    expect(distanceBetween(phonemesOf('こう'), phonemesOf('こ'))).toBeGreaterThan(0)
  })
})
