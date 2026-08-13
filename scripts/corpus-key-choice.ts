// Which of a character's meanings it should be taught under, asked of the model and written to
// corpus/<locale>/key-choice.json. The model orders the glosses the dictionary states and writes no
// word of its own, so `corpus:keys` stays a table walking an order: it reads this file where there is
// one and the dictionary's own order where there is not.
//
// Run with `pnpm corpus:key-choice [locale] [most]`, where `most` bounds a run so a first one can be
// read by hand before the rest is paid for. The key comes from `.env.local`, which the command loads
// itself: the application is handed it by the framework, and a plain Node run is not.
//
// A batch is asynchronous, so this is re-run rather than waited on, on the same terms as corpus:name.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { collectBatch, submitBatch } from '../src/ai/corpus/batch.ts'
import type { Reach } from '../src/ai/corpus/batch.ts'
import {
  KEY_CHOICE_VERSION,
  keyChoicePrefix,
  keyChoiceRequest,
  readKeyChoice,
} from '../src/ai/corpus/prompts/key-choice.ts'
import { keyOrderFile, readKeyOrder, readNaming } from '../src/data/corpus/artifact.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { parseGlosses } from '../src/data/corpus/kanjidic.ts'
import { nextStep, readSubmitted, submittedFile } from '../src/data/corpus/naming-run.ts'
import { asOptional } from '../src/data/optional-text.ts'
import { fetched, list } from './corpus-command.ts'

try {
  process.loadEnvFile('.env.local')
} catch {
  // Absent before the first bootstrap, which is not an error.
}

const SOURCE = 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz'

const locale = process.argv[2] ?? 'fr'
const bound = process.argv[3]
if (bound !== undefined && (!Number.isInteger(Number(bound)) || Number(bound) < 1)) {
  throw new Error(`most must be a whole number above zero, got ${bound}`)
}
const most = bound === undefined ? Infinity : Number(bound)

const key = asOptional(process.env['ANTHROPIC_API_KEY'])
if (key === undefined) throw new Error('ANTHROPIC_API_KEY is not set')

const reach: Reach = { key }
const orderFile = `corpus/${locale}/key-choice.json`
const runFile = `corpus/${locale}/.key-choice-batch.json`

if (!existsSync(INVENTORY_FILE)) {
  throw new Error(`${INVENTORY_FILE} is missing. Run pnpm corpus:inventory first, since the characters weighed are the ones the curriculum deals.`)
}
if (!existsSync(orderFile)) {
  throw new Error(`${orderFile} is missing. It carries the header this run writes into, so it is created rather than guessed at.`)
}

const naming = readNaming(readFileSync(`corpus/${locale}/naming.json`, 'utf8'))
const settled = readKeyOrder(readFileSync(orderFile, 'utf8'))
const glosses = parseGlosses(await fetched(SOURCE, 'KANJIDIC2'), locale)
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))

// A character with one gloss has no order to settle, and one already settled is not asked again. What
// is left is the whole of what a run can pay for.
const owed = subjects
  .filter((one) => one.type === 'kanji' && one.characters !== null && !one.hidden)
  .sort((one, other) => one.level - other.level || one.id - other.id)
  .map((one) => one.characters as string)
  .filter((character) => (glosses.get(character) ?? []).length > 1 && !settled.has(character))

const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, owed.slice(0, most), KEY_CHOICE_VERSION)

if (step.do === 'submit') await submit(step.parts)
else if (step.do === 'collect') await collect(step.id)
else process.stdout.write(`${locale}: every character with a choice to make has an order\n`)

async function submit(characters: readonly string[]): Promise<void> {
  const prefix = keyChoicePrefix(naming.language)
  const asked = characters.map((character) => ({
    subject: character,
    params: keyChoiceRequest(prefix, { character, glosses: glosses.get(character) ?? [] }),
  }))

  const id = await submitBatch(asked, reach)
  writeFileSync(runFile, submittedFile({ id, version: KEY_CHOICE_VERSION }))

  process.stdout.write(`submitted: ${asked.length} of ${owed.length} characters to weigh, batch ${id}\n`)
  process.stdout.write(`run pnpm corpus:key-choice ${locale} again to collect it\n`)
}

async function collect(id: string): Promise<void> {
  const collected = await collectBatch(id, reach)
  if (!collected.ended) {
    process.stdout.write(`batch ${id} is ${collected.status}. Run pnpm corpus:key-choice ${locale} again to collect it\n`)
    return
  }

  const { answered, failed } = collected
  const unusable = new Map(failed)
  const kept = new Map<string, readonly string[]>()
  const spent = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 }

  for (const [character, one] of answered) {
    spent.input += one.spent.input
    spent.output += one.spent.output
    spent.cacheCreation += one.spent.cacheCreation
    spent.cacheRead += one.spent.cacheRead

    const order = readKeyChoice(one.text, glosses.get(character) ?? [])
    if (order === null) unusable.set(character, 'not an order over the glosses it was given')
    else kept.set(character, order)
  }

  // Written before the run file is dropped. A write that fails leaves the batch collectable again,
  // where dropping it first would lose answers that are already paid for.
  writeFileSync(orderFile, keyOrderFile(readFileSync(orderFile, 'utf8'), kept))
  rmSync(runFile)

  process.stdout.write(`collected: ${kept.size} ordered, written to ${orderFile}\n`)
  process.stdout.write(`still to weigh: ${owed.length - kept.size}, asked again by the next run\n`)
  process.stdout.write(`refused: ${list([...unusable.keys()])}\n`)
  process.stdout.write(
    `spent: ${spent.input} in, ${spent.output} out, ${spent.cacheCreation} written to cache, ${spent.cacheRead} read from it\n`,
  )
}
