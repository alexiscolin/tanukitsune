import { describe, expect, it } from 'vitest'

import { withText } from './corpus-text'
import type { Subject } from './subject'

const REST = { id: 451, nuance: null, mnemonic: null } as unknown as Subject
const OUT = { id: 599, nuance: null, mnemonic: null } as unknown as Subject

describe('withText', () => {
  it('gives a subject the text the corpus holds for it', () => {
    const [joined] = withText([REST], new Map([['451', { nuance: 'la pause', mnemonic: 'une histoire' }]]))

    expect(joined?.nuance).toBe('la pause')
    expect(joined?.mnemonic).toBe('une histoire')
  })

  // A locale that has not written a card yet is the ordinary state of every locale but the first, and
  // a card with no text is a card the reader still meets: the question is asked either way.
  it('leaves a subject the corpus has nothing for alone', () => {
    const [joined] = withText([OUT], new Map([['451', { nuance: 'la pause', mnemonic: 'une histoire' }]]))

    expect(joined?.nuance).toBeNull()
    expect(joined?.mnemonic).toBeNull()
  })

  it('keeps the order the deck was dealt in', () => {
    const joined = withText([OUT, REST], new Map())

    expect(joined.map((one) => one.id)).toEqual([599, 451])
  })
})
