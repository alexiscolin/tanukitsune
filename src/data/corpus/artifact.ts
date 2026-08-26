import { z } from 'zod'

import type { ComponentNames, Glyph } from '@/core/corpus/decomposition'
import type { Naming } from '@/core/corpus/name'
import type { Named } from './reading-run.ts'
import type { Word } from './lexique.ts'

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

// The word each character is taught and graded under, written by corpus:keys. Read here so the report
// can say which components a key names, since a component a kanji writes has no name of its own.
const keyList = z.object({ keys: z.record(z.string(), z.string()) })

export function readKeys(json: string): Readonly<Record<string, string>> {
  return keyList.parse(JSON.parse(json)).keys
}

// Every word a character is graded on, the one its card shows first and the rest behind it. A key is
// one word and a character often means several: 土 is terre and it is also sol, and a reader typing the
// second is right. Written by corpus:keys beside the keys themselves, from the same ordered glosses, so
// the two cannot disagree about which word leads.
const meaningList = z.object({
  header: z.unknown(),
  meanings: z.record(z.string(), z.array(z.string()).nonempty()),
})

export function readMeanings(json: string): Readonly<Record<string, readonly string[]>> {
  return meaningList.parse(JSON.parse(json)).meanings
}

// What a file says about itself, read back so a run rewriting one keeps the provenance the run that
// wrote it recorded rather than restating it.
export function headerOf(json: string): unknown {
  return meaningList.parse(JSON.parse(json)).header
}

export function meaningsFile(written: { header: unknown; meanings: Readonly<Record<string, readonly string[]>> }): string {
  const lines = Object.entries(written.meanings)
    .map(([character, meanings]) => `${JSON.stringify(character)}:${JSON.stringify(meanings)}`)
    .join(',\n')

  return `{\n"header":${JSON.stringify(written.header)},\n"meanings":{\n${lines}\n}\n}\n`
}

// The order a run settled over each character's glosses, which is the only thing the model decides
// about a key. Absent before the first run, and a character it does not name keeps the order the
// dictionary states, so the file is an improvement over that order rather than a requirement for it.
const orderList = z.object({ order: z.record(z.string(), z.array(z.string())) })

export function readKeyOrder(json: string): ReadonlyMap<string, readonly string[]> {
  return new Map(Object.entries(orderList.parse(JSON.parse(json)).order))
}

export function keyOrderFile(current: string, added: ReadonlyMap<string, readonly string[]>): string {
  const file = anyFile.parse(JSON.parse(current))
  const order = { ...orderList.parse(file).order, ...Object.fromEntries(added) }

  return `${JSON.stringify({ ...file, order }, null, 2)}\n`
}

// What a language cannot do with sounds. The checks that judge an anchor are the engine's and know
// nothing about French; this is what makes them French, and what a second language replaces without
// a line of code changing.
// The limits sit here rather than in the engine for the same reason: how far a word may sit from a
// reading and still be heard in it is a fact about the pair of languages, and what an unrated word is
// worth depends on the scale that locale's ratings use.
const phonology = z.object({
  cannotStart: z.array(z.string()),
  nearest: z.number().positive(),
  apart: z.number().nonnegative(),
  unrated: z.number().nonnegative(),
  atMostMorae: z.number().int().positive(),
  atLeastCommon: z.number().nonnegative(),
  partsOfSpeech: z.array(z.string()).min(1),
  atMostWords: z.number().int().positive(),
  hears: z.record(z.string(), z.string()),
  writes: z.record(z.string(), z.string()),
})

export function readPhonology(json: string): {
  readonly cannotStart: readonly string[]
  readonly nearest: number
  readonly apart: number
  readonly unrated: number
  readonly atMostMorae: number
  readonly atLeastCommon: number
  readonly partsOfSpeech: readonly string[]
  readonly atMostWords: number
  readonly hears: ReadonlyMap<string, string>
  readonly writes: ReadonlyMap<string, string>
} {
  const { hears, writes, ...rest } = phonology.parse(JSON.parse(json))

  return { ...rest, hears: new Map(Object.entries(hears)), writes: new Map(Object.entries(writes)) }
}

// The readings the curriculum names and the words a locale can bind one to. Both are written by a
// command and read by the next, so they are bounded here like everything else a run hands on.
const readings = z.object({ readings: z.record(z.string(), z.tuple([z.string().nullable(), z.boolean(), z.array(z.string())])) })

export function readReadings(json: string): ReadonlyMap<string, Named> {
  const { readings: named } = readings.parse(JSON.parse(json))

  return new Map(
    Object.entries(named).map(([value, [type, taught, by]]) => [value, { type: type as Named['type'], taught, by }]),
  )
}

// The anchors a run bound and the readings it could not, read by the run that asks for the words still
// owed. Both sit in one file because a list only a terminal saw is a list the next command cannot act on.
const anchors = z.object({
  anchors: z.record(z.string(), z.tuple([z.string(), z.array(z.string()), z.number()])),
  left: z.record(z.string(), z.string()),
})

export function readAnchors(json: string): {
  readonly bound: ReadonlyMap<string, { readonly anchor: string; readonly phonemes: readonly string[]; readonly frequency: number }>
  readonly left: ReadonlyMap<string, string>
} {
  const read = anchors.parse(JSON.parse(json))

  return {
    bound: new Map(
      Object.entries(read.anchors).map(([reading, [anchor, phonemes, frequency]]) => [
        reading,
        { anchor, phonemes, frequency },
      ]),
    ),
    left: new Map(Object.entries(read.left)),
  }
}

const lexicon = z.object({
  words: z.record(z.string(), z.tuple([z.array(z.string()), z.number(), z.string(), z.number().nullable()])),
})

export function readLexicon(json: string): ReadonlyMap<string, Word> {
  const { words } = lexicon.parse(JSON.parse(json))

  return new Map(
    Object.entries(words).map(([text, [phonemes, frequency, category, seen]]) => [
      text,
      { phonemes, frequency, category, ...(seen === null ? {} : { imageability: seen }) },
    ]),
  )
}

// The shape a name takes in that language, which is the other half of the same idea: the rule judging
// a name knows how to read a shape and nothing about which one.
// Bounded where it is read, because this file is edited by hand and a shape that parses while being
// unusable refuses every name there is with nothing pointing at the file.
const naming = z.object({
  language: z.string().min(1),
  opensWith: z.array(z.string()).min(1),
  letters: z.string().min(1),
  // Bounded like the rest: what holds two letters together also holds an article to its noun, so a
  // locale that lists none refuses every name it is given, pointing at the answer rather than here.
  joiners: z.string().min(1),
  mostWords: z.number().int().positive(),
  examples: z.array(z.object({ character: z.string(), name: z.string() })),
})

export function readNaming(json: string): Naming {
  return naming.parse(JSON.parse(json))
}
