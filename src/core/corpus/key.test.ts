import { describe, expect, it } from 'vitest'

import { chooseKeys, isOrderOf } from './key'

const glosses: Record<string, readonly string[]> = {
  犬: ['chien'],
  石: ['pierre'],
  // Eight of them upstream, and the first is the one a reader meets.
  本: ['livre', 'origine', 'principal'],
  岩: ['pierre', 'rocher'],
}

const glossesOf = (character: string) => glosses[character] ?? []

describe('chooseKeys', () => {
  it('takes the first gloss the source states', () => {
    expect(chooseKeys(['犬'], glossesOf).keys).toEqual({ 犬: 'chien' })
  })

  // One key per subject and one subject per key: the second character to want a word takes the next
  // gloss it has, since two characters answering to the same word cannot be graded apart.
  it('moves to the next gloss where an earlier character took the first', () => {
    expect(chooseKeys(['石', '岩'], glossesOf).keys).toEqual({ 石: 'pierre', 岩: 'rocher' })
  })

  it('folds case before calling two keys the same', () => {
    expect(chooseKeys(['石', '岩'], (one) => (one === '石' ? ['Pierre'] : ['pierre', 'rocher'])).keys).toEqual({
      石: 'Pierre',
      岩: 'rocher',
    })
  })

  // Nothing is invented here. A character whose every gloss is spoken for is reported so it can be
  // settled by hand or by a later run, which is the rule docs/corpus.md holds for the whole pipeline.
  it('settles nothing for a character whose every gloss is taken', () => {
    const { keys, unsettled } = chooseKeys(['石', '岩'], (one) => (one === '石' ? ['pierre'] : ['pierre']))

    expect(keys).toEqual({ 石: 'pierre' })
    expect(unsettled).toEqual(['岩'])
  })

  it('settles nothing for a character the source does not gloss', () => {
    expect(chooseKeys(['々'], glossesOf)).toEqual({ keys: {}, unsettled: ['々'] })
  })
})

describe('isOrderOf', () => {
  it('holds for a reordering of exactly those glosses', () => {
    expect(isOrderOf(['second', 'chic'], ['chic', 'second'])).toBe(true)
  })

  // What makes a stored order self-healing. A release that restates a character, or a rule that cleans
  // a gloss, leaves an order describing words that are no longer there, and walking it would teach a
  // word the dictionary no longer states. Such an order is not one, so the source order stands and the
  // character is weighed again.
  it('fails where a gloss has moved out from under the order', () => {
    expect(isOrderOf(['petit (taille)', 'bas'], ['petit', 'bas'])).toBe(false)
  })

  it('fails where the order is short of a gloss', () => {
    expect(isOrderOf(['chic'], ['chic', 'second'])).toBe(false)
  })
})
