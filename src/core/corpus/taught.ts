import type { Decomposition, Glyph } from './decomposition'

// Which parts a story may name: the ones the curriculum teaches, decided in
// docs/decisions/0013-the-curriculum-decides-the-parts.md. A story built on the drawing alone names
// things the reader has never been shown, and a card teaching a part no story uses teaches nothing.
//
// The shape is still asked one thing, where each part sits, because the curriculum does not say and a
// story that puts a part in the wrong half of the character describes a different character.

export function partsTaught(
  _character: string,
  _components: readonly string[],
  _shape: readonly Glyph[],
): Decomposition {
  return { character: _character, parts: [] }
}
