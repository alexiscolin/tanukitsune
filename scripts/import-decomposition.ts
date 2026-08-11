// Turns the KanjiVG release into the decomposition the corpus reads, written to corpus/decomposition.json.
//
// Run with `pnpm corpus:decomposition`, which is a plain Node run over TypeScript: the pipeline is not
// part of the app, and giving it a bundler would make a build step out of a file that is regenerated
// perhaps twice a year. It takes the release path as an argument, or fetches the pinned one.
//
// The licence, the attribution it obliges and the separation from the generated text are in
// docs/decisions/0012-kanjivg-for-the-decomposition.md.

import { readFileSync, writeFileSync } from 'node:fs'

import { fetched } from './corpus-command.ts'
import { parseGlyphs } from '../src/data/corpus/kanjivg.ts'

const RELEASE = 'r20240807'
const SOURCE = `https://github.com/KanjiVG/kanjivg/releases/download/${RELEASE}/kanjivg-20240807.xml.gz`
const OUTPUT = 'corpus/decomposition.json'

// Carried inside the artifact rather than beside it, because the obligation follows the file wherever
// it is served and a sibling licence file does not travel with a published chunk.
const HEADER = {
  source: 'KanjiVG (https://kanjivg.tagaini.net/), copyright Ulrich Apel',
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
  release: RELEASE,
  modified: 'Parts and their positions extracted from the stroke data. The strokes are not carried.',
  shape: 'character to parts, each part being its component or null, its position or null, and its own parts',
}

const given = process.argv[2]
const xml = given === undefined ? await fetched(SOURCE, `KanjiVG ${RELEASE}`) : readFileSync(given, 'utf8')
const glyphs = parseGlyphs(xml)

const lines = [...glyphs]
  .map(([character, glyph]) => `${JSON.stringify(character)}:${JSON.stringify(glyph.parts)}`)
  .join(',\n')

writeFileSync(OUTPUT, `{\n"header":${JSON.stringify(HEADER)},\n"characters":{\n${lines}\n}\n}\n`)

process.stdout.write(`decomposition: ${glyphs.size} characters written to ${OUTPUT}\n`)
