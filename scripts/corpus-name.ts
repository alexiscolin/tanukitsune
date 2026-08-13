// What one locale calls each component of a character, asked of the model and judged before a name
// is written. It names what the curriculum deals, since a story may only name a part the reader has
// been dealt a card for.
//
// Run with `pnpm corpus:name [locale] [most]`, where `most` bounds a run to that many components so a
// first one can be read by hand before the rest is paid for. The key comes from `.env.local`, which
// the command loads itself: the application is handed it by the framework, and a plain Node run is not.
//
// A batch is asynchronous, so this is re-run rather than waited on. The first run submits and writes
// down the identifier, a run finding the batch still going says so, and the one finding it ended
// judges the answers and writes the names. What is refused is not written and is asked again by the
// next run, which is the same mechanism as a request the batch could not answer at all.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { collectBatch, submitBatch } from '../src/ai/corpus/batch.ts'
import type { Reach } from '../src/ai/corpus/batch.ts'
import {
  COMPONENT_NAME_VERSION,
  componentNamePrefix,
  componentNameRequest,
  readComponentName,
} from '../src/ai/corpus/prompts/component-name.ts'
import { composedBy } from '../src/core/corpus/decomposition.ts'
import { acceptNames } from '../src/core/corpus/name.ts'
import {
  componentNamesFile,
  readComponentNames,
  readDecompositions,
  readNaming,
} from '../src/data/corpus/artifact.ts'
import { walkCurriculum } from '../src/data/corpus/curriculum.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { nextStep, readSubmitted, submittedFile } from '../src/data/corpus/naming-run.ts'
import { asOptional } from '../src/data/optional-text.ts'

try {
  process.loadEnvFile('.env.local')
} catch {
  // Absent before the first bootstrap, which is not an error.
}

const locale = process.argv[2] ?? 'fr'
const bound = process.argv[3]
if (bound !== undefined && (!Number.isInteger(Number(bound)) || Number(bound) < 1)) {
  throw new Error(`most must be a whole number above zero, got ${bound}`)
}
const most = bound === undefined ? Infinity : Number(bound)

const key = asOptional(process.env['ANTHROPIC_API_KEY'])
if (key === undefined) throw new Error('ANTHROPIC_API_KEY is not set')

const reach: Reach = { key }

const namesFile = `corpus/${locale}/components.json`
const runFile = `corpus/${locale}/.naming-batch.json`

if (!existsSync(INVENTORY_FILE)) {
  throw new Error(`${INVENTORY_FILE} is missing. Run pnpm corpus:inventory first, since what is owed is counted against the curriculum.`)
}

const written = readFileSync(namesFile, 'utf8')
const names = readComponentNames(written)
const naming = readNaming(readFileSync(`corpus/${locale}/naming.json`, 'utf8'))
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))

const { read, owed } = walkCurriculum(subjects, names, (character) => decompositions.get(character) ?? [])
const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, owed.slice(0, most), COMPONENT_NAME_VERSION)

if (step.do === 'submit') await submit(step.parts)
else if (step.do === 'collect') await collect(step.id)
else process.stdout.write(`${locale}: every component owed a name of its own has one\n`)

async function submit(parts: readonly string[]): Promise<void> {
  const builds = composedBy(read)
  // One prefix for the whole run, cached and shared by every request behind it. The names already
  // taken travel in it, which is why a name settled by this run cannot be cached into the next one.
  const prefix = componentNamePrefix(naming, Object.values(names))

  const asked = parts.map((character) => ({
    subject: character,
    params: componentNameRequest(prefix, { character, composes: builds.get(character) ?? [] }),
  }))

  const id = await submitBatch(asked, reach)
  writeFileSync(runFile, submittedFile({ id, version: COMPONENT_NAME_VERSION }))

  process.stdout.write(`submitted: ${asked.length} of ${owed.length} components owed, batch ${id}\n`)
  process.stdout.write(`run pnpm corpus:name ${locale} again to collect it\n`)
}

async function collect(id: string): Promise<void> {
  const collected = await collectBatch(id, reach)
  if (!collected.ended) {
    process.stdout.write(`batch ${id} is ${collected.status}. Run pnpm corpus:name ${locale} again to collect it\n`)
    return
  }

  const { answered, failed } = collected
  const unusable = new Map(failed)
  const proposed: { component: string; name: string }[] = []
  const spent = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 }

  for (const [component, one] of answered) {
    spent.input += one.spent.input
    spent.output += one.spent.output
    spent.cacheCreation += one.spent.cacheCreation
    spent.cacheRead += one.spent.cacheRead

    const name = readComponentName(one.text)
    if (name === null) unusable.set(component, 'unreadable')
    else proposed.push({ component, name })
  }

  const { kept, refused } = acceptNames(proposed, names, naming)

  // Written before the run file is dropped. A write that fails leaves the batch collectable again,
  // where dropping it first would lose answers that are already paid for.
  writeFileSync(namesFile, componentNamesFile(written, kept))
  rmSync(runFile)

  process.stdout.write(`collected: ${kept.size} named, written to ${namesFile}\n`)
  process.stdout.write(`still owed: ${owed.length - kept.size}, asked again by the next run\n`)
  report('refused', [...refused].map(([component, why]) => `${component} ${why}`))
  report('no answer', [...unusable].map(([component, why]) => `${component} ${why}`))
  process.stdout.write(
    `spent: ${spent.input} in, ${spent.output} out, ${spent.cacheCreation} written to cache, ${spent.cacheRead} read from it\n`,
  )
}

function report(label: string, entries: readonly string[]): void {
  if (entries.length === 0) return

  const shown = entries.slice(0, 20).join(', ')
  process.stdout.write(`${label}: ${entries.length > 20 ? `${entries.length}, first 20: ${shown}` : shown}\n`)
}
