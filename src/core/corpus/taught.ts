import type { Decomposition, Glyph } from './decomposition'

// Which parts a story may name: the ones the curriculum teaches, decided in
// docs/decisions/0013-the-curriculum-decides-the-parts.md. A story built on the drawing alone names
// things the reader has never been shown, and a card teaching a part no story uses teaches nothing.
//
// The shape is still asked one thing, where each part sits, because the curriculum does not say and a
// story that puts a part in the wrong half of the character describes a different character.

export function partsTaught(
  character: string,
  components: readonly string[],
  shape: readonly Glyph[],
): Decomposition {
  const placed = placesIn(shape, new Set(components))

  // Ordered by where the part sits in the drawing, since that is the order a story runs in. The
  // curriculum lists its components by identifier, which is an order about their catalogue. A part
  // the drawing does not carry keeps the order the curriculum gave it, after the ones it does.
  const parts = [...components]
    .map((component, index) => ({
      component,
      position: placed.get(component)?.position ?? null,
      at: placed.get(component)?.at ?? placed.size + index,
    }))
    .sort((one, other) => one.at - other.at)
    .map(({ component, position }) => ({ component, position }))

  return { character, parts }
}

// Where each taught part sits in the drawing, and how far into it, walking in the order the character
// is written.
//
// A taught part is not opened further. 語 draws 言 with a 口 inside it, and once 言 is a part of its own
// that inner 口 is already accounted for: taking it would place 口 on the left, where the reader sees
// nothing of the kind. So the walk stops at every part it recognises.
function placesIn(
  shape: readonly Glyph[],
  taught: ReadonlySet<string>,
): ReadonlyMap<string, { position: string | null; at: number }> {
  const places = new Map<string, { position: string | null; at: number }>()

  const walk = (glyphs: readonly Glyph[], inherited: string | null): void => {
    for (const glyph of glyphs) {
      const position = glyph.position ?? inherited
      const { component } = glyph

      if (component !== null && taught.has(component)) {
        if (!places.has(component)) places.set(component, { position, at: places.size })
        continue
      }

      walk(glyph.parts, position)
    }
  }

  walk(shape, null)

  return places
}
