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

const RELEASE = 'Lexique383'
const SOURCES: Readonly<Record<string, string>> = {
  fr: `http://www.lexique.org/databases/${RELEASE}/${RELEASE}.tsv`,
}

const HEADER = {
  source: 'Lexique 3 (http://www.lexique.org/), Boris New and Christophe Pallier',
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
  release: RELEASE,
  modified:
    'One row per written form, the most common where the release states several. The phonemic code is written as the IPA, and a form carrying a sound the articulatory table does not describe is left out. Four of the release\'s thirty-five columns are carried.',
  shape: 'written form to its phonemes, how common it is in film subtitles per million, and its part of speech',
}

const locale = process.argv[2] ?? 'fr'
const given = process.argv[3]
const source = SOURCES[locale]

if (source === undefined) {
  throw new Error(`No lexicon is named for ${locale}. Lexique states French, and another language needs its own source in this file`)
}

const tsv = given === undefined ? await fetched(source, `Lexique ${RELEASE}`) : readFileSync(given, 'utf8')
const words = parseLexicon(tsv)

const output = `corpus/${locale}/.lexicon.json`
const lines = [...words]
  .map(([written, word]) => `${JSON.stringify(written)}:${JSON.stringify([word.phonemes, word.frequency, word.category])}`)
  .join(',\n')

writeFileSync(output, `{\n"header":${JSON.stringify(HEADER)},\n"words":{\n${lines}\n}\n}\n`)

process.stdout.write(`lexicon: ${words.size} words written to ${output}\n`)
