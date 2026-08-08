import { describe, expect, it } from 'vitest'

import { parseGlyphs } from './kanjivg'

// Trimmed from the release the corpus is built against: the strokes are dropped except one, which is
// there to prove they are ignored rather than counted as parts.
const TWO_PARTS = `<kanji id="kvg:kanji_04f11">
<g id="kvg:04f11" kvg:element="休">
  <g id="kvg:04f11-g1" kvg:element="亻" kvg:variant="true" kvg:original="人" kvg:position="left" kvg:radical="general">
    <path id="kvg:04f11-s1" kvg:type="㇒" d="M35,16.5c0.25,1.75"/>
  </g>
  <g id="kvg:04f11-g2" kvg:element="木" kvg:position="right"/>
</g>
</kanji>`

const NESTED = `<kanji id="kvg:kanji_08a9e">
<g id="kvg:08a9e" kvg:element="語">
  <g id="kvg:08a9e-g1" kvg:element="言" kvg:position="left" kvg:radical="general">
    <g id="kvg:08a9e-g2" kvg:element="口"/>
  </g>
  <g id="kvg:08a9e-g3" kvg:element="吾" kvg:position="right" kvg:phon="吾">
    <g id="kvg:08a9e-g4" kvg:element="五"/>
    <g id="kvg:08a9e-g5" kvg:element="口"/>
  </g>
</g>
</kanji>`

const VARIANT = `<kanji id="kvg:kanji_04f11-Kaisho">
<g id="kvg:04f11-Kaisho" kvg:element="休">
  <g id="kvg:04f11-Kaisho-g1" kvg:element="人" kvg:position="left"/>
</g>
</kanji>`

const UNSTATED = `<kanji id="kvg:kanji_09ce5">
<g id="kvg:09ce5" kvg:element="鳥">
  <g id="kvg:09ce5-g1"/>
  <g id="kvg:09ce5-g2" kvg:element="灬" kvg:position="bottom"/>
</g>
</kanji>`

describe('parseGlyphs', () => {
  it('reads the parts of a character with the position each one holds', () => {
    const glyph = parseGlyphs(TWO_PARTS).get('休')

    expect(glyph?.parts.map((part) => [part.component, part.position])).toEqual([
      ['亻', 'left'],
      ['木', 'right'],
    ])
  })

  // The tree is what the source states and the depth a mnemonic uses is a rule applied to it, so
  // reading it flat here would decide that rule in the parser, where nothing can see the names.
  it('keeps the nesting the source states', () => {
    const glyph = parseGlyphs(NESTED).get('語')

    expect(glyph?.parts.map((part) => part.component)).toEqual(['言', '吾'])
    expect(glyph?.parts[1]?.parts.map((part) => part.component)).toEqual(['五', '口'])
  })

  // The release carries calligraphic variants of a character under the same element. One character
  // owes one decomposition, or the corpus holds two answers to the question a mnemonic asks.
  it('keeps one decomposition per character when the release carries a variant', () => {
    const glyph = parseGlyphs(`${TWO_PARTS}\n${VARIANT}`).get('休')

    expect(glyph?.parts.map((part) => part.component)).toEqual(['亻', '木'])
  })

  // 341 characters of the jouyou set carry a group with no character behind it. The part exists in
  // the shape and nothing can name it, so it is read as unstated rather than dropped: dropping it
  // would hand a model a character whose parts look complete and are not.
  it('reads a group with no character as a part with no component', () => {
    const glyph = parseGlyphs(UNSTATED).get('鳥')

    expect(glyph?.parts.map((part) => part.component)).toEqual([null, '灬'])
  })
})
