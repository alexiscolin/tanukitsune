import { describe, expect, it } from 'vitest'

import { allocate } from './choose'
import type { Candidate, Wanted } from './choose'

const LIMITS = { nearest: 0.45, apart: 0.3, unrated: 4 }

function word(text: string, ...phonemes: readonly string[]): Candidate {
  return { text, phonemes, frequency: 50 }
}

function reading(value: string, ...phonemes: readonly string[]): Wanted {
  return { value, phonemes }
}

const COU = word('le cou', 'k', 'u')
const COUP = word('le coup', 'k', 'u')
const SEL = word('le sel', 's', 'ɛ', 'l')
// Agrees with か at the start and still sits 0.6 away, where the ceiling is 0.45.
const CAMION = word('le camion', 'k', 'a', 'm', 'j', 'ɔ̃')

// Two readings near enough that the same words serve both, which is what makes them compete.
const KO = reading('こ', 'k', 'o')
const KU = reading('く', 'k', 'u')

describe('allocate', () => {
  it('gives a reading a word that starts on the same sound and stays close', () => {
    const { allocated } = allocate([reading('こう', 'k', 'o', 'o')], () => [word('le corps', 'k', 'ɔ', 'ʁ')], LIMITS)

    expect(allocated).toEqual([{ reading: 'こう', anchor: 'le corps', phonemes: ['k', 'ɔ', 'ʁ'] }])
  })

  // One word for one reading, or the reader meets one cue standing for two answers. Nothing here may
  // keep the second reading off the word except the word being taken, so the separation is opened.
  it('never gives one word to two readings', () => {
    const { allocated } = allocate([KO, KU], () => [COU], { ...LIMITS, apart: 0 })

    expect(allocated).toEqual([{ reading: 'こ', anchor: 'le cou', phonemes: ['k', 'u'] }])
  })

  // Two anchors that sound alike are one cue pointing at both, which is the failure that only shows
  // at scale. Both words are free here and the second reading still takes nothing, because the only
  // one left sounds like the anchor already placed.
  it('keeps the anchors of two readings apart', () => {
    const { allocated, unserved } = allocate([KO, KU], () => [COU, COUP], LIMITS)

    expect(allocated).toEqual([{ reading: 'こ', anchor: 'le cou', phonemes: ['k', 'u'] }])
    expect(unserved).toEqual([{ reading: 'く', reason: 'none free' }])
  })

  // The reading with the fewest candidates is served first, or a common word is spent on a reading
  // that had ten others and the scarce one is left with nothing. Served in the order they arrive,
  // こ takes the one word く could have had and く goes without.
  it('serves the most constrained reading first', () => {
    const { allocated } = allocate([KO, KU], (one) => (one.value === 'く' ? [COU] : [COU, COUP]), {
      ...LIMITS,
      apart: 0,
    })

    expect(allocated.find((one) => one.reading === 'く')?.anchor).toBe('le cou')
    expect(allocated.find((one) => one.reading === 'こ')?.anchor).toBe('le coup')
  })

  // Nothing is settled in silence: a reading left with no acceptable word is named, not handed the
  // least bad one.
  it('names a reading it cannot serve rather than serving it badly', () => {
    const { allocated, unserved } = allocate([reading('は', 'h', 'a')], () => [word('hôtel', 'o', 't', 'ɛ', 'l')], LIMITS)

    expect(allocated).toEqual([])
    expect(unserved).toEqual([{ reading: 'は', reason: 'none acceptable' }])
  })

  // The two reasons ask the reader for different things: a lexicon too narrow for this reading, or a
  // curriculum wanting more words than the reading has. Naming the reading alone tells them neither.
  it('separates a reading no word fits from one whose words were spent elsewhere', () => {
    const { unserved } = allocate([reading('せ', 's', 'e'), reading('せん', 's', 'e', 'n')], () => [SEL], LIMITS)

    expect(unserved).toEqual([{ reading: 'せん', reason: 'none free' }])
  })

  // The word begins on the reading's own sound, so nothing but the distance keeps it out.
  it('refuses a word too far from the reading to be heard in it', () => {
    const { unserved } = allocate([reading('か', 'k', 'a')], () => [CAMION], LIMITS)

    expect(unserved).toEqual([{ reading: 'か', reason: 'none acceptable' }])
  })
})

describe('allocate, on how well a word can be pictured', () => {
  // Read only among the words already close enough to be heard in the reading, and above how ordinary
  // the word is.
  it('prefers the word that can be pictured over the one that cannot', () => {
    const seen = { text: 'le sabre', phonemes: ['s', 'a', 'b'], frequency: 10, imageability: 6.5 }
    const vague = { text: 'le savoir', phonemes: ['s', 'a', 'v'], frequency: 90, imageability: 2.1 }
    const { allocated } = allocate([reading('さ', 's', 'a')], () => [vague, seen], LIMITS)

    expect(allocated[0]?.anchor).toBe('le sabre')
  })

  // A word nobody rated is not a word nobody can picture, so it is ranked on what is known about it
  // rather than dropped.
  it('keeps a word no rating covers', () => {
    const { allocated } = allocate([reading('さ', 's', 'a')], () => [word('le sac', 's', 'a', 'k')], LIMITS)

    expect(allocated[0]?.anchor).toBe('le sac')
  })
})
