import { describe, expect, it } from 'vitest'

import type { Glyph } from './decomposition'
import { partsTaught } from './taught'

function glyph(component: string | null, position: string | null, ...parts: readonly Glyph[]): Glyph {
  return { component, position, parts }
}

// 語 as the shape states it, which is where a position comes from.
const SHAPE = [glyph('言', 'left', glyph('口', null)), glyph('吾', 'right', glyph('五', null), glyph('口', null))]

describe('partsTaught', () => {
  // The curriculum says what the reader has been dealt a card for, so a story rests on those and on
  // nothing else. The shape is asked where each one sits and nothing more.
  it('names one part per component the curriculum teaches', () => {
    const taught = partsTaught('語', ['言', '五', '口'], SHAPE)

    expect(taught.parts.map((part) => part.component)).toEqual(['言', '五', '口'])
  })

  it('takes each position from the shape', () => {
    const taught = partsTaught('語', ['言', '吾'], SHAPE)

    expect(taught.parts.map((part) => part.position)).toEqual(['left', 'right'])
  })

  // A story runs in the order the parts occur in the character, and the curriculum lists its
  // components by identifier, which is an order about their catalogue rather than about the drawing.
  it('orders the parts as the character draws them, not as the curriculum lists them', () => {
    const taught = partsTaught('語', ['吾', '言'], SHAPE)

    expect(taught.parts.map((part) => part.component)).toEqual(['言', '吾'])
  })

  // Some of their components are drawings with no character at all, and some name a part the shape
  // does not carry. Kept with no position rather than dropped, so it reaches a report instead of
  // disappearing from a story that then names one part fewer.
  it('keeps a component the shape does not carry, with no position', () => {
    const taught = partsTaught('語', ['言', '亀'], SHAPE)

    expect(taught.parts).toContainEqual({ component: '亀', position: null })
  })
})
