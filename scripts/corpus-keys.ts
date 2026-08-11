// Turns the KANJIDIC2 release into the keys a locale teaches, written to corpus/<locale>/keys.json.
//
// Run with `pnpm corpus:keys [locale] [path]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states. It takes the release path as an argument, or fetches the pinned one.
//
// A key is selected from a gloss the source already states and then made unique, per docs/corpus.md.
// What no gloss can settle is reported rather than invented.
//
// The English the account grades on is not written here. It is the account's, so it stays in the
// uncommitted inventory that already carries it and never reaches a file that travels.

import { gunzipSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'

import { chooseKeys } from '../src/core/corpus/key.ts'
import { parseGlosses } from '../src/data/corpus/kanjidic.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

const RELEASE = '2026-08-11'
const SOURCE = 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz'

const HEADER = {
  source: 'KANJIDIC2 (https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), Electronic Dictionary Research and Development Group',
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
  release: RELEASE,
  modified: 'One gloss selected per character and made unique. The readings, grades and stroke counts are not carried.',
  shape: 'character to the key this locale teaches it under',
}

const locale = process.argv[2] ?? 'fr'
const given = process.argv[3]
const output = `corpus/${locale}/keys.json`

const xml = given === undefined ? await fetched() : readFileSync(given, 'utf8')
const spoken = parseGlosses(xml, locale)

// The order the reader meets them in, so the plainest word goes to the character taught first and a
// later one takes the next gloss it has. Sorted here rather than trusted from the file, since the
// selection is only reproducible if the order is.
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
const characters = subjects
  .filter((one) => one.type === 'kanji' && one.characters !== null && !one.hidden)
  .sort((one, other) => one.level - other.level || one.id - other.id)
  .map((one) => one.characters as string)

const keyed = chooseKeys(characters, (character) => spoken.get(character) ?? [])
const written = characters.filter((character) => keyed.keys[character] !== undefined)

const lines = written
  .map((character) => `${JSON.stringify(character)}:${JSON.stringify(keyed.keys[character])}`)
  .join(',\n')

writeFileSync(output, `{\n"header":${JSON.stringify(HEADER)},\n"keys":{\n${lines}\n}\n}\n`)

process.stdout.write(`keys: ${written.length} of ${characters.length} written to ${output}\n`)
process.stdout.write(`no gloss the source states is free: ${list(keyed.unsettled)}\n`)

function list(entries: readonly string[]): string {
  if (entries.length === 0) return '0'

  const shown = entries.slice(0, 20).join(' ')

  return entries.length > 20 ? `${entries.length}, first 20: ${shown}` : `${entries.length}: ${shown}`
}

async function fetched(): Promise<string> {
  const response = await fetch(SOURCE)
  if (!response.ok) throw new Error(`KANJIDIC2 answered ${response.status}`)

  return gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8')
}
