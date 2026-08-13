import { describe, expect, it } from 'vitest'

import type { ComponentNames, Decomposition, Glyph } from './decomposition'
import {
  collidingNames,
  composedBy,
  flatten,
  holdsTooManyParts,
  isFullyStated,
  MOST_PARTS,
  namesKanjiWrites,
  unnamedComponents,
  wordlessComponents,
} from './decomposition'

function glyph(component: string | null, ...parts: readonly Glyph[]): Glyph {
  return { component, position: null, parts }
}

// 語 as the source states it: 言 on the left, 吾 on the right, and 吾 made of 五 and 口.
const GO = [glyph('言'), glyph('吾', glyph('五'), glyph('口'))]

const nameable = (...known: readonly string[]) => (component: string) => known.includes(component)

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

describe('flatten', () => {
  it('keeps a part the locale can name', () => {
    const flat = flatten('語', GO, nameable('言', '吾'))

    expect(flat.parts.map((part) => part.component)).toEqual(['言', '吾'])
  })

  // 吾 is a character the reader has no picture of, so a story resting on it rests on nothing. One
  // level down are three things that can be seen.
  it('opens a part the locale cannot name into the parts it is made of', () => {
    const flat = flatten('語', GO, nameable('言', '五', '口'))

    expect(flat.parts.map((part) => part.component)).toEqual(['言', '五', '口'])
  })

  // Opening it further would say the character is made of strokes, which is true and useless.
  it('keeps a part nothing can name and nothing can open', () => {
    const flat = flatten('語', GO, nameable('言'))

    expect(flat.parts.map((part) => part.component)).toEqual(['言', '五', '口'])
  })

  // The story runs in the order the parts occur, so the reader reads the character the way the
  // mnemonic was written. An expansion inherits the place of the part it replaced.
  it('keeps the order the character puts its parts in', () => {
    const flat = flatten('休', [glyph('亻'), glyph('木')], nameable('亻', '木'))

    expect(flat.parts.map((part) => part.component)).toEqual(['亻', '木'])
  })

  // A group with no character is opened where it holds parts, since those can be named, and kept
  // where it holds none, since it is the edge of what the data states.
  it('opens a nameless group holding parts and keeps one holding none', () => {
    const opened = flatten('鳥', [glyph(null, glyph('灬'))], nameable('灬'))
    const kept = flatten('鳥', [glyph(null), glyph('灬')], nameable('灬'))

    expect(opened.parts.map((part) => part.component)).toEqual(['灬'])
    expect(kept.parts.map((part) => part.component)).toEqual([null, '灬'])
  })
})

describe('holdsTooManyParts', () => {
  // Past four the reader holds a list rather than a scene, and the interaction that does the
  // remembering has nowhere to happen.
  it('reports a character opened into more parts than one story carries', () => {
    const many = Array.from({ length: MOST_PARTS + 1 }, (_, index) => glyph(String(index)))
    const flat = flatten('X', many, () => true)

    expect(holdsTooManyParts(flat)).toBe(true)
  })

  it('says nothing about a character within it', () => {
    expect(holdsTooManyParts(flatten('語', GO, nameable('言', '吾')))).toBe(false)
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

describe('namesKanjiWrites', () => {
  // A component a kanji writes is named by that kanji's key, so a name of its own is a second French
  // word on one shape. Nothing owes these any more, so the report is the only thing left that sees them.
  it('reports a name written on a component a kanji already writes', () => {
    expect(namesKanjiWrites({ 木: "l'arbre", 亻: 'le passant' }, new Set(['木']))).toEqual(['木'])
  })

  it('says nothing when no name sits on a component a kanji writes', () => {
    expect(namesKanjiWrites({ 亻: 'le passant' }, new Set(['木']))).toEqual([])
  })
})

describe('wordlessComponents', () => {
  // The hole this rule exists to make visible. A component a kanji writes is not owed a name, and a
  // character whose every gloss is taken gets no key, so a shape can fall between the two and be
  // taught under no word at all while every count reads clean.
  it('reports a component with neither a name of its own nor a key', () => {
    expect(wordlessComponents(['言', '木'], { 木: "l'arbre" }, new Set(['木']))).toEqual(['言'])
  })

  it('says nothing where a key names the shape', () => {
    expect(wordlessComponents(['言'], {}, new Set(['言']))).toEqual([])
  })

  it('says nothing where a name of its own does', () => {
    expect(wordlessComponents(['言'], { 言: 'la parole' }, new Set())).toEqual([])
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

describe('composedBy', () => {
  // The kanji a component builds are the evidence its name is judged on: a name picturing nothing
  // those characters contain is a name for a different shape.
  it('gives each component the characters it builds', () => {
    const built = composedBy([character('語', '言', '五', '口'), character('話', '言', '舌')])

    expect(built.get('言')).toEqual(['語', '話'])
    expect(built.get('舌')).toEqual(['話'])
  })

  // A character standing as its own only part builds nothing, and saying that 木 builds 木 tells a
  // model nothing it can picture.
  it('does not have a character build itself', () => {
    expect(composedBy([character('木', '木')]).has('木')).toBe(false)
  })

  it('says nothing about a part the source does not name', () => {
    expect(composedBy([character('鳥', null, '灬')]).has('灬')).toBe(true)
    expect(composedBy([character('鳥', null, '灬')]).size).toBe(1)
  })
})
