import { describe, expect, it } from 'vitest'

import { confusablePairs, notInjective } from './allocation'

const ALLOCATION = [
  { reading: 'こう', anchor: 'le cou', phonemes: ['k', 'u'] },
  { reading: 'しょう', anchor: 'le chausson', phonemes: ['ʃ', 'o', 's', 'ɔ̃'] },
  { reading: 'か', anchor: 'le car', phonemes: ['k', 'a', 'ʁ'] },
]

describe('notInjective', () => {
  // One anchor for a reading and one reading for an anchor. The second half is what a generator
  // breaks without noticing, since it writes one item at a time and sees no other.
  it('reports an anchor standing for two readings', () => {
    const clash = [...ALLOCATION, { reading: 'ごう', anchor: 'le cou', phonemes: ['k', 'u'] }]

    expect(notInjective(clash)).toEqual(['le cou'])
  })

  it('reports a reading given two anchors', () => {
    const clash = [...ALLOCATION, { reading: 'こう', anchor: 'la couette', phonemes: ['k', 'w', 'ɛ', 't'] }]

    expect(notInjective(clash)).toEqual(['こう'])
  })

  it('says nothing about an allocation where each stands for one', () => {
    expect(notInjective(ALLOCATION)).toEqual([])
  })
})

describe('confusablePairs', () => {
  // The failure that only shows at scale. Two readings a learner already struggles to keep apart,
  // given two anchors that sound the same, produce one cue pointing at both, which is a cue that
  // points at neither.
  it('reports two readings whose anchors sound alike', () => {
    const alike = [
      { reading: 'こう', anchor: 'le cou', phonemes: ['k', 'u'] },
      { reading: 'ごう', anchor: 'le coup', phonemes: ['k', 'u'] },
    ]

    expect(confusablePairs(alike, 0.3)).toEqual([['こう', 'ごう']])
  })

  it('says nothing when the anchors are far enough apart', () => {
    expect(confusablePairs(ALLOCATION, 0.3)).toEqual([])
  })

  // Reported once, as the pair it is, rather than twice in both directions: the report is a list of
  // decisions to take and each pair is one decision.
  it('reports a pair once', () => {
    const three = [
      { reading: 'こう', anchor: 'le cou', phonemes: ['k', 'u'] },
      { reading: 'ごう', anchor: 'le coup', phonemes: ['k', 'u'] },
      { reading: 'こ', anchor: 'le coût', phonemes: ['k', 'u'] },
    ]

    expect(confusablePairs(three, 0.3)).toHaveLength(3)
  })
})
