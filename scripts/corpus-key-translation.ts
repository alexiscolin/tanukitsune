// The word a character is taught under where the release states no gloss in the locale, carried across
// from the English it does state and written to corpus/<locale>/key-translation.json. `corpus:keys`
// reads that file as one more gloss a character has, so the selection and the uniqueness stay where
// they were.
//
// Run with `pnpm corpus:key-translation [locale] [most]`, where `most` bounds a run so a first one can
// be read by hand before the rest is paid for. The key comes from `.env.local`, which the command
// loads itself: the application is handed it by the framework, and a plain Node run is not.
//
// A batch is asynchronous, so this is re-run rather than waited on, on the same terms as corpus:name.
// A word the locale cannot write is refused here rather than written and found later.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { collectBatch, submitBatch } from '../src/ai/corpus/batch.ts'
import type { Reach } from '../src/ai/corpus/batch.ts'
import {
  KEY_TRANSLATION_VERSION,
  keyTranslationPrefix,
  keyTranslationRequest,
  readKeyTranslation,
} from '../src/ai/corpus/prompts/key-translation.ts'
import { faultInKey } from '../src/core/corpus/key.ts'
import { keyOrderFile, readKeyOrder, readNaming } from '../src/data/corpus/artifact.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { parseGlosses } from '../src/data/corpus/kanjidic.ts'
import { add, nextStep, noSpend, readSubmitted, spentLine, submittedFile } from '../src/data/corpus/naming-run.ts'
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
const carriedFile = `corpus/${locale}/key-translation.json`
const runFile = `corpus/${locale}/.key-translation-batch.json`

if (!existsSync(INVENTORY_FILE)) {
  throw new Error(`${INVENTORY_FILE} is missing. Run pnpm corpus:inventory first, since the characters carried are the ones the curriculum deals.`)
}
if (!existsSync(carriedFile)) {
  throw new Error(`${carriedFile} is missing. It carries the header this run writes into, so it is created rather than guessed at.`)
}

const naming = readNaming(readFileSync(`corpus/${locale}/naming.json`, 'utf8'))
const carried = readKeyOrder(readFileSync(carriedFile, 'utf8'))
const xml = await fetched(SOURCE, 'KANJIDIC2')
const spoken = parseGlosses(xml, locale)
const english = parseGlosses(xml, 'en')
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))

// A character the release glosses in the locale needs nothing carried, and one already carried is not
// asked again. What is left is the whole of what a run can pay for.
const dealt = subjects
  .filter((one) => one.type === 'kanji' && one.characters !== null && !one.hidden)
  .sort((one, other) => one.level - other.level || one.id - other.id)

const taught = new Map(dealt.map((one) => [one.characters as string, one.meanings]))

const owed = dealt
  .map((one) => one.characters as string)
  .filter(
    (character) =>
      (spoken.get(character) ?? []).length === 0 &&
      (english.get(character) ?? []).length > 0 &&
      !carried.has(character),
  )

const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, owed.slice(0, most), KEY_TRANSLATION_VERSION)

if (step.do === 'submit') await submit(step.parts)
else if (step.do === 'collect') await collect(step.id)
else process.stdout.write(`${locale}: every character the release does not gloss has a word carried across\n`)

async function submit(characters: readonly string[]): Promise<void> {
  const prefix = keyTranslationPrefix(naming.language)
  const asked = characters.map((character) => ({
    subject: character,
    params: keyTranslationRequest(prefix, {
      character,
      english: english.get(character) ?? [],
      taught: taught.get(character) ?? [],
    }),
  }))

  const id = await submitBatch(asked, reach)
  writeFileSync(runFile, submittedFile({ id, version: KEY_TRANSLATION_VERSION }))

  process.stdout.write(`submitted: ${asked.length} of ${owed.length} characters to carry across, batch ${id}\n`)
  process.stdout.write(`run pnpm corpus:key-translation ${locale} again to collect it\n`)
}

async function collect(id: string): Promise<void> {
  const collected = await collectBatch(id, reach)
  if (!collected.ended) {
    process.stdout.write(`batch ${id} is ${collected.status}. Run pnpm corpus:key-translation ${locale} again to collect it\n`)
    return
  }

  const { answered, failed } = collected
  const refused = new Map(failed)
  const kept = new Map<string, readonly string[]>()
  const spent = noSpend()

  for (const [character, one] of answered) {
    add(spent, one.spent)

    const word = readKeyTranslation(one.text)
    if (word === null) {
      refused.set(character, 'unreadable')
      continue
    }

    // Judged here rather than written and found later: a word the locale cannot write is a card nobody
    // can answer, and the character is asked again by the next run like any other refusal.
    const fault = faultInKey(word, naming)
    if (fault !== null) refused.set(character, `${word}: ${fault}`)
    else kept.set(character, [word])
  }

  // Written before the run file is dropped. A write that fails leaves the batch collectable again,
  // where dropping it first would lose answers that are already paid for.
  writeFileSync(carriedFile, keyOrderFile(readFileSync(carriedFile, 'utf8'), kept))
  rmSync(runFile)

  process.stdout.write(`collected: ${kept.size} carried across, written to ${carriedFile}\n`)
  process.stdout.write(`still to carry: ${owed.length - kept.size}, asked again by the next run\n`)
  process.stdout.write(`refused: ${list([...refused].map(([character, why]) => `${character} ${why}`))}\n`)
  process.stdout.write(spentLine(spent))
}
