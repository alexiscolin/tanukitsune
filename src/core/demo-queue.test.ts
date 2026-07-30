import { isKana } from 'wanakana'
import { describe, expect, it } from 'vitest'

import { DEMO_QUEUE } from './demo-queue'

function subjectIds() {
  return new Set(DEMO_QUEUE.map((entry) => entry.subjectId))
}

describe('DEMO_QUEUE', () => {
  it('reviews ten subjects, each for its meaning and for its reading', () => {
    expect(subjectIds().size).toBe(10)
    expect(DEMO_QUEUE).toHaveLength(20)

    for (const subjectId of subjectIds()) {
      const kinds = DEMO_QUEUE.filter((entry) => entry.subjectId === subjectId).map(
        (entry) => entry.kind,
      )

      expect([...kinds].sort()).toEqual(['meaning', 'reading'])
    }
  })

  it('accepts a reading only as kana, which is the only thing the field can produce', () => {
    for (const entry of DEMO_QUEUE.filter((candidate) => candidate.kind === 'reading')) {
      for (const reference of entry.accepted) expect(isKana(reference)).toBe(true)
    }
  })

  it('carries no blank reference, which would accept an empty answer at tier 1', () => {
    for (const entry of DEMO_QUEUE) {
      for (const reference of entry.accepted) expect(reference.trim()).not.toBe('')
    }
  })

  it('shows the same characters for both questions about one subject', () => {
    for (const subjectId of subjectIds()) {
      const shown = new Set(
        DEMO_QUEUE.filter((entry) => entry.subjectId === subjectId).map((entry) => entry.characters),
      )

      expect(shown.size).toBe(1)
    }
  })
})
