// Turns the Lexique release into the words a locale can bind a reading to, written to
// corpus/<locale>/.lexicon.json.
//
// Run with `pnpm corpus:lexicon [locale] [path]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states. It takes the release path as an argument, or fetches the pinned one.
//
// The file is not committed, and not for the reason the inventory is not: a public dictionary carries
// no reader's data. It is an input to the run that allocates anchors and nothing serves it, so seven
// megabytes rebuilt in seconds would sit in the history forever to save nobody anything. What travels is anchors.json, which carries each anchor's derived
// pronunciation, so the check that an anchor is a real word runs where the release is.
//
// Every locale needs its own lexicon and no two languages are served by one source, so a locale this
// has no source for is refused rather than written from the nearest thing at hand.

import { readFileSync, writeFileSync } from 'node:fs'

import { fetched } from './corpus-command.ts'
import { parseLexicon } from '../src/data/corpus/lexique.ts'
import { parseImagery } from '../src/data/corpus/semantiqc.ts'

const RELEASE = 'Lexique383'
const SOURCES: Readonly<Record<string, string>> = {
  fr: `http://www.lexique.org/databases/${RELEASE}/${RELEASE}.tsv`,
}

// How well a word can be seen, which Lexique states nowhere and which decides an anchor wherever two
// words sound equally near. A locale with no such norms is not refused: its words arrive unrated and
// the limits say what that is worth.
const RATINGS: Readonly<Record<string, string>> = {
  fr: 'https://lingualab.ca/dataset/SemantiQc_visual.tsv',
}

const HEADER = {
  source: 'Lexique 3 (http://www.lexique.org/), Boris New and Christophe Pallier',
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
  release: RELEASE,
  rated: 'SemantiQc (https://lingualab.ca/en/project/norms-familiarity-perceptual-strength/), visual perceptual strength, Chedid and colleagues',
  modified:
    'One row per written form, the most common where the release states several. The phonemic code is written as the IPA, and a form carrying a sound the articulatory table does not describe is left out. Four of the release\'s thirty-five columns are carried, plus how well the word can be seen where the norms rate it.',
  shape: 'written form to its phonemes, how common it is in film subtitles per million, its part of speech, and how well it can be seen where that is rated',
}

const locale = process.argv[2] ?? 'fr'
const given = process.argv[3]
const source = SOURCES[locale]

if (source === undefined) {
  throw new Error(`No lexicon is named for ${locale}. Lexique states French, and another language needs its own source in this file`)
}

const tsv = given === undefined ? await fetched(source, `Lexique ${RELEASE}`) : readFileSync(given, 'utf8')
const norms = RATINGS[locale]
const rated = norms === undefined ? new Map<string, number>() : parseImagery(await fetched(norms, 'SemantiQc'))
const words = parseLexicon(tsv, rated)

const output = `corpus/${locale}/.lexicon.json`
const lines = [...words]
  .map(
    ([written, word]) =>
      `${JSON.stringify(written)}:${JSON.stringify([word.phonemes, word.frequency, word.category, word.imageability ?? null])}`,
  )
  .join(',\n')

writeFileSync(output, `{\n"header":${JSON.stringify(HEADER)},\n"words":{\n${lines}\n}\n}\n`)

const seen = [...words.values()].filter((word) => word.imageability !== undefined).length
process.stdout.write(`lexicon: ${words.size} words written to ${output}, ${seen} of them rated for how well they are seen\n`)
