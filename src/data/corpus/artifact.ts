import type { Glyph } from '@/core/corpus/decomposition'

// Reads back what `scripts/import-decomposition.ts` wrote. The artifact is committed, so this is the
// only door between the corpus and a file nobody edits by hand.
export function readDecompositions(_json: string): ReadonlyMap<string, readonly Glyph[]> {
  return new Map()
}
