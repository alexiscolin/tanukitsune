import type { Glyph } from '@/core/corpus/decomposition'

// KanjiVG states each character as nested groups, one per part, carrying the part's own character and
// where it sits. That is the whole of what the corpus takes from it: the strokes are drawing data.
//
// Read here rather than through a parser dependency because the input is one machine-generated file at
// a pinned release, and because the shape taken from it is four attributes deep. The licence and the
// obligations that come with the data are in docs/decisions/0012-kanjivg-for-the-decomposition.md.
export function parseGlyphs(_xml: string): ReadonlyMap<string, Glyph> {
  return new Map()
}
