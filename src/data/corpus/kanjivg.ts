import type { Glyph } from '@/core/corpus/decomposition'

// KanjiVG states each character as nested groups, one per part, carrying the part's own character and
// where it sits. That is the whole of what the corpus takes from it: the strokes are drawing data.
//
// Read here rather than through a parser dependency because the input is one machine-generated file at
// a pinned release, and because the shape taken from it is four attributes deep. The licence and the
// obligations that come with the data are in docs/decisions/0012-kanjivg-for-the-decomposition.md.

// The release carries calligraphic variants of a character under ids suffixed after the code point,
// and each one repeats the same element. One character owes one decomposition.
const ENTRY = /<kanji\b[^>]*\bid="kvg:kanji_([^"]*)"[^>]*>([\s\S]*?)<\/kanji>/g
const GROUP = /<(\/?)g\b([^>]*)>/g
const ELEMENT = /\bkvg:element="([^"]*)"/
const POSITION = /\bkvg:position="([^"]*)"/

type Building = {
  component: string | null
  position: string | null
  readonly parts: Building[]
}

export function parseGlyphs(xml: string): ReadonlyMap<string, Glyph> {
  const glyphs = new Map<string, Glyph>()

  for (const [, id = '', body = ''] of xml.matchAll(ENTRY)) {
    if (id.includes('-')) continue

    const root = readGroups(body)
    if (root?.component === undefined || root.component === null) continue
    if (glyphs.has(root.component)) continue

    glyphs.set(root.component, root)
  }

  return glyphs
}

// One pass with a stack, because the nesting is the only thing being read: a group opens a part, a
// closing tag ends it, and a group that closes itself has no parts of its own.
function readGroups(body: string): Building | undefined {
  const open: Building[] = []
  let root: Building | undefined

  for (const [, closing, attributes = ''] of body.matchAll(GROUP)) {
    if (closing === '/') {
      open.pop()
      continue
    }

    const part: Building = {
      component: ELEMENT.exec(attributes)?.[1] ?? null,
      position: POSITION.exec(attributes)?.[1] ?? null,
      parts: [],
    }

    const parent = open.at(-1)
    if (parent === undefined) root ??= part
    else parent.parts.push(part)

    if (!attributes.trimEnd().endsWith('/')) open.push(part)
  }

  return root
}
