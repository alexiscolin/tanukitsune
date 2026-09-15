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
  it('holds every word the locale answers with, read the way an answer is', () => {
    expect(claimedWords(['la Pourriture', 'nourriture'])).toEqual(['nourriture', 'pourriture'])
  })

  // A reference in another language has no French neighbour to be caught by, so a guard holding only
  // the words near one another would let a slip on an English answer land on a French card's word.
  it('holds a word nothing else in the locale sits near, since the reference may be in another language', () => {
    expect(claimedWords(['philosophie', 'tableau noir'])).toEqual(['philosophie', 'tableau noir'])
  })

  it('writes a word once however many spellings reach it', () => {
    expect(claimedWords(['marché', 'marche', 'Marche'])).toEqual(['marche'])
  })

  it('holds nothing for a word that folds to nothing', () => {
    expect(claimedWords(["l'", 'eau'])).toEqual(['eau'])
  })
})
