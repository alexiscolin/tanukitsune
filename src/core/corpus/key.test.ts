import { describe, expect, it } from 'vitest'

import { chooseKeys, faultInKey, isOrderOf } from './key'

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

  // The rescue, and the reason it is a second pass rather than an order. 言 states one gloss, dire, and
  // 申 takes it first while still holding another it can move to. A shape stories name cannot be left
  // mute, so it takes the word and its holder steps sideways: one key moves, where serving the shapes
  // first would have moved hundreds to save this one.
  it('takes a word back for a shape left with none, where its holder can move', () => {
    const spoken = (one: string) => (one === '申' ? ['dire', 'singe'] : ['dire'])

    expect(chooseKeys(['申', '言'], spoken, new Set(['言'])).keys).toEqual({ 申: 'singe', 言: 'dire' })
  })

  it('leaves the shape unsettled where its holder has nowhere to move', () => {
    const spoken = () => ['dire']

    expect(chooseKeys(['申', '言'], spoken, new Set(['言']))).toEqual({ keys: { 申: 'dire' }, unsettled: ['言'] })
  })

  // The rescue serves a shape stories name, and nothing else: a leaf kanji left without a word is a
  // character the reader meets once, and taking a key off a settled character for it would be churn
  // rather than repair.
  it('rescues nothing for a character that names no shape', () => {
    const spoken = (one: string) => (one === '申' ? ['dire', 'singe'] : ['dire'])

    expect(chooseKeys(['申', '言'], spoken).unsettled).toEqual(['言'])
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

// French as its material states it, so a rule leaking into the engine shows up here.
const SHAPE = { opensWith: ['le ', 'la '], letters: "abcdefghijklmnopqrstuvwxyzàâçéèêëîïôùûœ", joiners: "' -", mostWords: 2 }

describe('faultInKey', () => {
  it('accepts a word the locale writes', () => {
    expect(faultInKey('dragon', SHAPE)).toBeNull()
  })

  // A key carries no article, unlike a component name: the reader types the word and is graded on it,
  // and la lune would be refused by every grader that reads lune.
  it('accepts a word with no article, which a name would be refused for', () => {
    expect(faultInKey('serviette', SHAPE)).toBeNull()
  })

  it('refuses a word another script wrote', () => {
    expect(faultInKey('dragon 龍', SHAPE)).toBe('not the locale')
  })

  it('refuses what carries no letter at all', () => {
    expect(faultInKey('- -', SHAPE)).toBe('nothing to read')
  })

  // A key is a noun phrase and not a name, so it carries no bound: pomme de terre is what 芋 means and
  // refusing it for its three words would refuse the language. The bound in the material is the one a
  // component name answers to, where a story has to carry the name in a clause.
  it('accepts a phrase where a component name would be too long', () => {
    expect(faultInKey('pomme de terre', SHAPE)).toBeNull()
  })
})
