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
  componentName,
  componentNamePrefix,
  componentNameRequest,
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
const most = process.argv[3] === undefined ? Infinity : Number(process.argv[3])
if (!(most > 0)) throw new Error(`most must be a whole number above zero, got ${process.argv[3]}`)

const key = asOptional(process.env['ANTHROPIC_API_KEY'])
if (key === undefined) throw new Error('ANTHROPIC_API_KEY is not set')

// The host is a seam rather than a constant, as it is everywhere else that reaches a third party: a
// command able to reach only the real one cannot be tested. Absent is the real one.
const api = asOptional(process.env['ANTHROPIC_API'])
const reach: Reach = { key, ...(api === undefined ? {} : { api }) }

const namesFile = `corpus/${locale}/components.json`
// Beside the locale's material rather than in it, and hidden: it belongs to a run rather than to the
// language, and it names a job on somebody's account, so it is never committed.
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
else process.stdout.write(`${locale}: every component the curriculum deals has a name\n`)

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
  writeFileSync(runFile, submittedFile({ id, version: COMPONENT_NAME_VERSION, asked: asked.length }))

  process.stdout.write(`submitted: ${asked.length} of ${owed.length} components owed, batch ${id}\n`)
  process.stdout.write(`run pnpm corpus:name ${locale} again to collect it\n`)
}

async function collect(id: string): Promise<void> {
  const { answered, failed } = await collectBatch(id, reach)
  const unusable = new Map(failed)
  const proposed: { component: string; name: string }[] = []
  const spent = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 }

  for (const [component, one] of answered) {
    for (const [what, count] of Object.entries(one.spent)) spent[what as keyof typeof spent] += count

    const read = componentName.safeParse(asJson(one.text))
    if (read.success) proposed.push({ component, name: read.data.name })
    else unusable.set(component, 'unreadable')
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

// A model that answered with something other than its schema is one entry lost, not a run lost: the
// component keeps no name and the next run asks for it again.
function asJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function report(label: string, entries: readonly string[]): void {
  if (entries.length === 0) return

  const shown = entries.slice(0, 20).join(', ')
  process.stdout.write(`${label}: ${entries.length > 20 ? `${entries.length}, first 20: ${shown}` : shown}\n`)
}
