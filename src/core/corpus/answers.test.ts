import { describe, expect, it } from 'vitest'

import { alsoAcceptedFor, claimedWords } from './answers'

function wrote(shown: string, ...rest: string[]) {
  return { shown, wrote: [shown, ...rest] }
}

describe('alsoAcceptedFor', () => {
  it('keeps a word the locale wrote that no card is answered with', () => {
    const also = alsoAcceptedFor(new Map([['1', wrote('la force', 'la puissance')]]))

    expect(also.get('1')).toEqual(['la puissance'])
  })

  it('drops the word the card already shows, which is answered before this is read', () => {
    const also = alsoAcceptedFor(new Map([['1', wrote('la force', 'la force')]]))

    expect(also.get('1')).toEqual([])
  })

  it('drops a word another card is answered with, which means that card and not this one', () => {
    const also = alsoAcceptedFor(
      new Map([
        ['1', wrote('la force', 'la puissance')],
        ['2', wrote('la puissance')],
      ]),
    )

    expect(also.get('1')).toEqual([])
  })

  it('compares the way the grader does, so an accent does not smuggle a card word back in', () => {
    const also = alsoAcceptedFor(
      new Map([
        ['1', wrote('le marché', 'la marche')],
        ['2', wrote('marche')],
      ]),
    )

    expect(also.get('1')).toEqual([])
  })

  it('writes a word once however often the locale repeated it', () => {
    const also = alsoAcceptedFor(new Map([['1', wrote('la force', 'la puissance', 'la Puissance')]]))

    expect(also.get('1')).toEqual(['la puissance'])
  })
})

describe('claimedWords', () => {
  it('holds a word another answer sits one edit from', () => {
    expect(claimedWords(['nourriture', 'pourriture'])).toEqual(['nourriture', 'pourriture'])
  })

  it('holds a word another answer sits an accent from', () => {
    expect(claimedWords(['marché', 'marche'])).toEqual(['marche'])
  })

  it('leaves out a word nothing sits near, which is most of the curriculum', () => {
    expect(claimedWords(['philosophie', 'tableau noir'])).toEqual([])
  })

  it('leaves out a pair too short for a slip, which the grader refuses on length alone', () => {
    expect(claimedWords(['six', 'dix'])).toEqual([])
  })
})
