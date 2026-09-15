import { describe, expect, it } from 'vitest'

import { runCascade } from './cascade'
import set from './answers.json'

// The grading gate. docs/specs/v0.1.md asks for the cascade to be measured on a committed set rather
// than asserted case by case, and for the two errors to be reported apart: a correct answer refused and
// a wrong answer accepted are not the same failure, because never punishing a correct answer is a
// product rule.
//
// Run with no port, which is what the app runs with: v0.1 ships tiers 1 and 2 and the reader grades
// what neither places.

// The share of the set the free tiers may hand back to the reader. A diagnostic budget over a set
// somebody chose, not a rate anything in production reaches: what a representative one needs is the
// eval set in docs/ai-engineering.md.
const FALL_THROUGH_BUDGET = 0.15

const graded = async (one: { kind: string; answer: string; accepted: string[]; refused?: string[] }) =>
  runCascade(
    {
      kind: one.kind === 'reading' ? 'reading' : 'meaning',
      answer: one.answer,
      accepted: one.accepted as [string, ...string[]],
      refused: one.refused ?? [],
    },
    null,
  )

describe('the cascade, over the committed answer set', () => {
  it('accepts none of the pairs, which is the number that may never move', async () => {
    const placed = []

    for (const pair of set.pairs) {
      const outcome = await graded({ kind: 'meaning', ...pair })

      if (outcome.verdict === 'correct') placed.push(`${pair.answer} taken for ${pair.accepted.join(', ')}`)
    }

    expect(placed, `${placed.length} of ${set.pairs.length} pairs were placed`).toEqual([])
  })

  it('hands back less than the budget, and refuses nothing it owes a verdict', async () => {
    const through = []
    const refused = []

    for (const one of set.answers) {
      const outcome = await graded(one)

      if (outcome.verdict === 'undecided') through.push(`${one.answer}: ${one.why}`)
      else if (outcome.verdict !== one.expect) refused.push(`${one.answer}: ${one.why}`)
    }

    // Reported apart, and both named rather than counted: a number nobody can read tells the next
    // reader how many failed and not which.
    expect(refused, `${refused.length} answers were given the wrong verdict`).toEqual([])
    expect(through.length / set.answers.length, `fell through: ${through.join(' | ')}`).toBeLessThan(
      FALL_THROUGH_BUDGET,
    )
  })
})
