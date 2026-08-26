// Settles every reading the curriculum names, written to corpus/.readings.json.
//
// Run with `pnpm corpus:readings [path]`, a plain Node run over TypeScript for the reason
// import-decomposition.ts states. It takes the KANJIDIC2 release path as an argument, or fetches the
// pinned one.
//
// Which reading a character is taught under comes from the curriculum, so this reads the inventory and
// KANJIDIC2 verifies rather than states. What the release cannot confirm is reported and kept: the
// curriculum is what the reader is graded against, and a release disagreeing with it is a line for
// whoever reads the run rather than a reason to refuse a card.
//
// The file is not committed, for the reason the inventory it reads is not: which reading is taught is
// the upstream curriculum's choice, of the same family as the parts it names, which
// docs/decisions/0013-the-curriculum-decides-the-parts.md keeps on the machine that read them. What
// travels is anchors.json, which is ours.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { fetched, KANJIDIC, list } from './corpus-command.ts'
import { parseReadings } from '../src/data/corpus/kanjidic.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { readingsOf, unconfirmed, wordsResting } from '../src/data/corpus/reading-run.ts'

const HEADER = {
  source: 'The curriculum the account deals, read into corpus/.inventory.json, verified against KANJIDIC2',
  modified: 'One entry per distinct reading, carrying whether a card teaches it or the account only accepts it.',
  shape: 'reading to its type, whether a card teaches it, and the characters naming it',
  disputed: 'The readings the release states otherwise, which the curriculum still teaches: it verifies rather than states.',
}

const OUTPUT = 'corpus/.readings.json'

if (!existsSync(INVENTORY_FILE)) {
  throw new Error(`No curriculum is read yet. Run pnpm corpus:inventory, which writes ${INVENTORY_FILE}`)
}

const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
const given = process.argv[2]
const xml = given === undefined ? await fetched(KANJIDIC, 'KANJIDIC2') : readFileSync(given, 'utf8')

const named = readingsOf(subjects)
const taught = [...named].filter(([, one]) => one.taught)

// Each of these is a reading the reader is graded on that the release states otherwise. Written beside
// the readings rather than printed alone: a line only a terminal saw is a line the next run cannot act
// on, and a run nobody watched loses it.
const disputed = unconfirmed(subjects, parseReadings(xml))

const lines = [...named]
  .map(([value, one]) => `${JSON.stringify(value)}:${JSON.stringify([one.type, one.taught, one.by])}`)
  .join(',\n')
const said = disputed
  .map((one) => `${JSON.stringify(one.character)}:${JSON.stringify([one.type, one.value])}`)
  .join(',\n')

writeFileSync(
  OUTPUT,
  `{\n"header":${JSON.stringify(HEADER)},\n"readings":{\n${lines}\n},\n"disputed":{\n${said}\n}\n}\n`,
)

// The word split beside the reading count, since the two answer different questions and the documents
// quote both: how many sounds are owed an anchor, and how many cards have to teach one.
const { dealt, resting } = wordsResting(subjects)

process.stdout.write(`readings: ${named.size} named, ${taught.length} taught by a card, written to ${OUTPUT}\n`)
process.stdout.write(`words: ${dealt} dealt, ${resting} resting on what their characters taught and ${dealt - resting} teaching a reading\n`)

if (disputed.length > 0) {
  process.stdout.write(
    `readings KANJIDIC2 states otherwise: ${list(disputed.map((one) => `${one.character} ${one.type} ${one.value}`))}\n`,
  )
}
