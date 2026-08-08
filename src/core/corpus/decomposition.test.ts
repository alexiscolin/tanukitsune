import { describe, expect, it } from 'vitest'

import type { ComponentNames, Decomposition } from './decomposition'
import { collidingNames, isFullyStated, unnamedComponents } from './decomposition'

function character(char: string, ...components: readonly (string | null)[]): Decomposition {
  return { character: char, parts: components.map((component) => ({ component, position: null })) }
}

const NAMES: ComponentNames = { 言: 'la parole', 五: 'cinq', 口: 'la bouche' }

describe('unnamedComponents', () => {
  // The whole point of the report: 855 components carry the jouyou set and 209 of them have a name
  // available under a licence, so what this returns is the work the locale owes before a single
  // mnemonic can be written.
  it('reports a component no name covers', () => {
    expect(unnamedComponents([character('語', '言', '五', '口', '亠')], NAMES)).toEqual(['亠'])
  })

  it('says nothing when every part is named', () => {
    expect(unnamedComponents([character('語', '言', '五', '口')], NAMES)).toEqual([])
  })

  // A component recurs across the set by design, that recurrence being what makes naming it worth
  // anything. Reporting it once per occurrence would turn a list of work into a list of characters.
  it('reports a component once however many characters use it', () => {
    const set = [character('信', '亻', '言'), character('休', '亻', '木')]

    expect(unnamedComponents(set, NAMES)).toEqual(['亻', '木'])
  })

  // A part with no character behind it cannot be named, so counting it as unnamed would put an
  // entry in the work list that no amount of work removes. `isFullyStated` is what reports those.
  it('ignores a part the decomposition leaves unstated', () => {
    expect(unnamedComponents([character('鳥', null, '灬')], { ...NAMES, 灬: 'le feu' })).toEqual([])
  })
})

describe('collidingNames', () => {
  // One name per component and one component per name. The second half is the one a generator
  // breaks without noticing, since it writes each item alone.
  it('reports a name given to two components', () => {
    expect(collidingNames({ 日: 'le soleil', 曰: 'le soleil', 月: 'la lune' })).toEqual(['le soleil'])
  })

  it('says nothing when every name belongs to one component', () => {
    expect(collidingNames(NAMES)).toEqual([])
  })
})

describe('isFullyStated', () => {
  it('holds for a character whose every part carries a component', () => {
    expect(isFullyStated(character('語', '言', '五', '口'))).toBe(true)
  })

  // 341 characters of the jouyou set carry a group the data does not name. A model handed one of
  // those would invent the missing part, which is the failure the report exists to prevent.
  it('fails for a character carrying a part with no component', () => {
    expect(isFullyStated(character('鳥', null, '灬'))).toBe(false)
  })
})
