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

import { asked } from './corpus-command.ts'
import { collectBatch, submitBatch } from '../src/ai/corpus/batch.ts'
import {
  COMPONENT_NAME_VERSION,
  componentNamePrefix,
  componentNameRequest,
  readComponentName,
} from '../src/ai/corpus/prompts/component-name.ts'
import { composedBy, flatten } from '../src/core/corpus/decomposition.ts'
import { acceptNames } from '../src/core/corpus/name.ts'
import {
  componentNamesFile,
  readComponentNames,
  readDecompositions,
  readNaming,
} from '../src/data/corpus/artifact.ts'
import { batchFor } from '../src/data/corpus/pipeline.ts'
import { walkCurriculum } from '../src/data/corpus/curriculum.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { add, nextStep, noSpend, readSubmitted, spentLine, submittedFile } from '../src/data/corpus/naming-run.ts'
import { drawnKey } from '../src/core/corpus/decomposition.ts'

const { locale, most, reach } = asked(process.argv)

const namesFile = `corpus/${locale}/components.json`
const runFile = batchFor('corpus:name', locale)

if (!existsSync(INVENTORY_FILE)) {
  throw new Error(`${INVENTORY_FILE} is missing. Run pnpm corpus:inventory first, since what is owed is counted against the curriculum.`)
}

const written = readFileSync(namesFile, 'utf8')
const names = readComponentNames(written)
const naming = readNaming(readFileSync(`corpus/${locale}/naming.json`, 'utf8'))
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))

const { read, drawn, owed } = walkCurriculum(subjects, names, (character) => decompositions.get(character) ?? [])

// Which kanji each part the curriculum draws builds, keyed as the report keys it since it carries no
// character. Built where it is read, like the relation beside it, so a run that only collects a batch
// does not walk the whole curriculum for a map it never opens.
function drawnBuilds(): Map<string, string[]> {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]))
  const built = new Map<string, string[]>()

  for (const subject of subjects) {
    if (subject.type !== 'kanji' || subject.characters === null || subject.hidden) continue

    for (const id of subject.componentIds) {
      const part = byId.get(id)
      if (part === undefined || part.characters !== null) continue

      const key = drawnKey(part)
      const carries = built.get(key)

      if (carries === undefined) built.set(key, [subject.characters])
      else carries.push(subject.characters)
    }
  }

  return built
}

function componentsOf(character: string): Set<string> {
  const { parts } = flatten(character, decompositions.get(character) ?? [], () => false)

  return new Set(parts.flatMap((part) => (part.component === null ? [] : [part.component])))
}

// What every character containing the part draws in common, which stands in for the picture of the
// part itself: docs/corpus.md states why that picture is neither fetched nor read.
function sharedBy(characters: readonly string[]): readonly string[] {
  const each = characters.map(componentsOf)

  return [...(each[0] ?? [])].filter((one) => each.every((set) => set.has(one)))
}
const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, owed.slice(0, most), COMPONENT_NAME_VERSION)

if (step.do === 'submit') await submit(step.parts)
else if (step.do === 'collect') await collect(step.id)
else process.stdout.write(`${locale}: every component owed a name of its own has one\n`)

async function submit(parts: readonly string[]): Promise<void> {
  const builds = composedBy(read)
  const builtBy = drawnBuilds()
  const draws = new Set(drawn)
  // One prefix for the whole run, cached and shared by every request behind it. The names already
  // taken travel in it, which is why a name settled by this run cannot be cached into the next one.
  const prefix = componentNamePrefix(naming, Object.values(names))

  const asked = parts.map((part) => {
    // Which of the two a part is comes from the curriculum, never from whether a kanji was found to
    // build it: a drawn part nothing dealt builds would otherwise be asked for as though the key the
    // report calls it were a character to be pictured.
    if (!draws.has(part)) {
      return { subject: part, params: componentNameRequest(prefix, { character: part, composes: builds.get(part) ?? [] }) }
    }

    const carries = builtBy.get(part) ?? []

    return { subject: part, params: componentNameRequest(prefix, { character: null, composes: carries, shape: sharedBy(carries) }) }
  })

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
  const spent = noSpend()

  for (const [component, one] of answered) {
    add(spent, one.spent)

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
  process.stdout.write(spentLine(spent))
}

function report(label: string, entries: readonly string[]): void {
  if (entries.length === 0) return

  const shown = entries.slice(0, 20).join(', ')
  process.stdout.write(`${label}: ${entries.length > 20 ? `${entries.length}, first 20: ${shown}` : shown}\n`)
}
