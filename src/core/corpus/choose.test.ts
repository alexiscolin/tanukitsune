import { describe, expect, it } from 'vitest'

import { allocate } from './choose'
import type { Candidate, Wanted } from './choose'

const LIMITS = { nearest: 0.45, apart: 0.3, cannotStart: ['h'] }

function word(text: string, ...phonemes: readonly string[]): Candidate {
  return { text, phonemes, frequency: 50 }
}

function reading(value: string, ...phonemes: readonly string[]): Wanted {
  return { value, phonemes }
}

const COU = word('le cou', 'k', 'u')
const COUP = word('le coup', 'k', 'u')
const CAR = word('le car', 'k', 'a', 'ʁ')
const SEL = word('le sel', 's', 'ɛ', 'l')

describe('allocate', () => {
  it('gives a reading a word that starts on the same sound and stays close', () => {
    const { allocated } = allocate([reading('こう', 'k', 'o', 'o')], () => [word('le corps', 'k', 'ɔ', 'ʁ')], LIMITS)

    expect(allocated).toEqual([{ reading: 'こう', anchor: 'le corps', phonemes: ['k', 'ɔ', 'ʁ'] }])
  })

  // One word for one reading, or the reader meets one cue standing for two answers.
  it('never gives one word to two readings', () => {
    const { allocated } = allocate([reading('か', 'k', 'a'), reading('かん', 'k', 'a', 'n')], () => [CAR], LIMITS)

    expect(allocated).toHaveLength(1)
  })

  // Two anchors that sound alike are one cue pointing at both, which is the failure that only shows
  // at scale. The second reading takes something else or takes nothing.
  it('keeps the anchors of two readings apart', () => {
    const { allocated } = allocate([reading('こう', 'k', 'o', 'o'), reading('ごう', 'g', 'o', 'o')], () => [COU, COUP], LIMITS)

    expect(allocated).toHaveLength(1)
  })

  // The reading with the fewest candidates is served first, or a common word is spent on a reading
  // that had ten others and the scarce one is left with nothing.
  it('serves the most constrained reading first', () => {
    const scarce = reading('せ', 's', 'e')
    const easy = reading('か', 'k', 'a')
    const { allocated } = allocate([easy, scarce], (one) => (one.value === 'せ' ? [SEL] : [CAR, SEL]), LIMITS)

    expect(allocated.find((one) => one.reading === 'せ')?.anchor).toBe('le sel')
    expect(allocated.find((one) => one.reading === 'か')?.anchor).toBe('le car')
  })

  // Nothing is settled in silence: a reading left with no acceptable word is named, not handed the
  // least bad one.
  it('names a reading it cannot serve rather than serving it badly', () => {
    const { allocated, unserved } = allocate([reading('は', 'h', 'a')], () => [word('hôtel', 'o', 't', 'ɛ', 'l')], LIMITS)

    expect(allocated).toEqual([])
    expect(unserved).toEqual(['は'])
  })

  it('refuses a word too far from the reading to be heard in it', () => {
    const { unserved } = allocate([reading('か', 'k', 'a')], () => [word('le kiwi', 'k', 'i', 'w', 'i')], {
      ...LIMITS,
      nearest: 0.1,
    })

    expect(unserved).toEqual(['か'])
  })
})

describe('allocate, on how well a word can be pictured', () => {
  // Imageability is the best-evidenced property of a keyword: the method works for words a reader can
  // see and does nothing for words they cannot. It outranks how ordinary a word is, and both are
  // read only among the words already close enough to be heard in the reading.
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
