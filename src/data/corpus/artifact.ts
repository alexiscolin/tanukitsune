import { z } from 'zod'

import type { Glyph } from '@/core/corpus/decomposition'

// Reads back what `scripts/import-decomposition.ts` wrote. The artifact is committed, so this is the
// only door between the corpus and a file nobody edits by hand.
//
// Parsed rather than trusted for the reason every other payload here is: a file that is not the
// artifact is a mistake in the pipeline, and it costs nothing to say so where it is read instead of
// three steps later where a part is missing and nobody knows why.
const glyph: z.ZodType<Glyph> = z.lazy(() =>
  z.strictObject({
    component: z.string().nullable(),
    position: z.string().nullable(),
    parts: z.array(glyph),
  }),
)

const artifact = z.object({ characters: z.record(z.string(), z.array(glyph)) })

export function readDecompositions(json: string): ReadonlyMap<string, readonly Glyph[]> {
  return new Map(Object.entries(artifact.parse(JSON.parse(json)).characters))
}
