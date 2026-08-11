import { z } from 'zod'

import type { ComponentNames, Glyph } from '@/core/corpus/decomposition'
import type { Naming } from '@/core/corpus/name'

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

// The names a run settled, written back into the file they were judged against. It takes the file
// rather than the names alone because the header carries the Kanji Alive attribution, and the licence
// obligation follows the file rather than the repository.
//
// Read as a bare record and validated separately rather than through one schema carrying both: a
// schema that declares a key hands it back first whatever order the file had, which lifts `names`
// above the header and rewrites a file that gained one line. Names are appended in the order the run
// settled them and never sorted, since sorting now would put every line already written into that
// same diff.
const anyFile = z.record(z.string(), z.unknown())

export function componentNamesFile(current: string, added: ReadonlyMap<string, string>): string {
  const file = anyFile.parse(JSON.parse(current))
  const names = { ...nameList.parse(file).names, ...Object.fromEntries(added) }

  return `${JSON.stringify({ ...file, names }, null, 2)}\n`
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
// Bounded where it is read, because this file is edited by hand and a shape that parses while being
// unusable refuses every name there is with nothing pointing at the file.
const naming = z.object({
  language: z.string().min(1),
  opensWith: z.array(z.string()).min(1),
  letters: z.string().min(1),
  joiners: z.string(),
  mostWords: z.number().int().positive(),
  examples: z.array(z.object({ character: z.string(), name: z.string() })),
})

export function readNaming(json: string): Naming {
  return naming.parse(JSON.parse(json))
}
