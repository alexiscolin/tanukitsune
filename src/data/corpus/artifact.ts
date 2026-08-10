import { z } from 'zod'

import type { ComponentNames, Glyph } from '@/core/corpus/decomposition'
import type { Shape } from '@/core/corpus/name'

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

// What one locale calls each component, which is the half of the decomposition that is written here
// rather than imported, no set of names existing under a licence that permits redistribution.
const nameList = z.object({ names: z.record(z.string(), z.string()) })

export function readComponentNames(json: string): ComponentNames {
  return nameList.parse(JSON.parse(json)).names
}

// What a language cannot do with sounds. The checks that judge an anchor are the engine's and know
// nothing about French; this is what makes them French, and what a second language replaces without
// a line of code changing.
const phonology = z.object({ cannotStart: z.array(z.string()) })

export function readPhonology(json: string): { readonly cannotStart: readonly string[] } {
  return phonology.parse(JSON.parse(json))
}

// The shape a name takes in that language, which is the other half of the same idea: the rule judging
// a name knows how to read a shape and nothing about which one.
const naming = z.object({
  opensWith: z.array(z.string()),
  letters: z.string(),
  joiners: z.string(),
  mostWords: z.number(),
})

export function readNaming(json: string): Shape {
  return naming.parse(JSON.parse(json))
}
