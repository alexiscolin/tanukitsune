// The meaning of a word the dictionary states in no language this corpus can use, asked of the model
// through a batch. It runs after `corpus:vocabulary`, over what that command left out, and the words
// it covers are largely transparent compounds a release does not bother stating: 三人 is three and
// person, 五月 is five and month.
//
// Run with `pnpm corpus:word [locale] [most]`, where `most` bounds a run to that many words so a first
// one can be read by hand before the rest is paid for. The key comes from `.env.local`, which the
// command loads itself: the application is handed it by the framework, and a plain Node run is not.
//
// A word the curriculum deals in kana alone has no characters to read a meaning off, so what the
// course teaches it as is the whole of what travels for it.
//
// A batch is asynchronous, so this is re-run rather than waited on, which is the mechanism corpus:name
// describes. A word whose meaning cannot be told comes back with nothing, which is an answer rather
// than a failure: it is a word for a person to write, and it is not written here.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { asked, list } from './corpus-command.ts'
import { collectBatch, submitBatch } from '../src/ai/corpus/batch.ts'
import { readWordMeaning, WORD_MEANING_VERSION, wordMeaningPrefix, wordMeaningRequest } from '../src/ai/corpus/prompts/word-meaning.ts'
import { faultInMeaning } from '../src/core/corpus/name.ts'
import { meaningsFile, readKeys, readMeanings, readNaming } from '../src/data/corpus/artifact.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { add, nextStep, noSpend, readSubmitted, spentLine, submittedFile } from '../src/data/corpus/naming-run.ts'
import { batchFor } from '../src/data/corpus/pipeline.ts'

const { locale, most, reach } = asked(process.argv)

const wordsFile = `corpus/${locale}/vocabulary.json`
const runFile = batchFor('corpus:word', locale)

if (!existsSync(wordsFile)) {
  throw new Error(`${wordsFile} is missing. Run pnpm corpus:vocabulary first, since what is owed is what the dictionary did not state.`)
}

const written = readFileSync(wordsFile, 'utf8')
const said = readMeanings(written)
const naming = readNaming(readFileSync(`corpus/${locale}/naming.json`, 'utf8'))
const keys = readKeys(readFileSync(`corpus/${locale}/keys.json`, 'utf8'))
const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))

const words = subjects.filter(
  (one) => (one.type === 'vocabulary' || one.type === 'kana_vocabulary') && one.characters !== null && !one.hidden,
)

// A word the dictionary did not state. One written with characters travels with the word each of them
// carries; one the curriculum deals in kana alone has none, and what the course teaches it as is the
// whole of what there is to read a meaning from.
const unread = words.filter(
  (one) =>
    said[one.characters as string] === undefined &&
    partsOf(one.characters as string).length === 0 &&
    one.type !== 'kana_vocabulary',
)
const owed = words.filter(
  (one) =>
    said[one.characters as string] === undefined &&
    (partsOf(one.characters as string).length > 0 || one.type === 'kana_vocabulary'),
)

// Said before anything is submitted rather than dropped in silence: a word written with characters this
// locale has no word for has nothing to read a meaning from, so it is never asked, and a set nobody
// counts is a set nobody notices growing.
if (unread.length > 0) {
  process.stdout.write(`not asked, no character of them carries a word here: ${list(unread.map((one) => one.characters as string))}\n`)
}

const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, owed.slice(0, most).map((one) => one.characters as string), WORD_MEANING_VERSION)

if (step.do === 'submit') await submit(step.parts)
else if (step.do === 'collect') await collect(step.id)
else process.stdout.write(`${locale}: every word the dictionary left carries a meaning\n`)

function partsOf(word: string): readonly { character: string; key: string }[] {
  return [...word].flatMap((character) => {
    const key = keys[character]

    return key === undefined ? [] : [{ character, key }]
  })
}

async function submit(asking: readonly string[]): Promise<void> {
  // One prefix for the whole run, cached and shared by every request behind it. Nothing settled by this
  // run travels in it, so a run does not invalidate its own cache.
  const prefix = wordMeaningPrefix(naming.language)
  const taughtBy = new Map(words.map((one) => [one.characters as string, one.meanings]))

  const requests = asking.map((word) => ({
    subject: word,
    params: wordMeaningRequest(prefix, { word, parts: partsOf(word), taught: taughtBy.get(word) ?? [] }),
  }))

  const id = await submitBatch(requests, reach)
  writeFileSync(runFile, submittedFile({ id, version: WORD_MEANING_VERSION }))

  process.stdout.write(`submitted: ${requests.length} of ${owed.length} words owed a meaning, batch ${id}\n`)
  process.stdout.write(`run pnpm corpus:word ${locale} again to collect it\n`)
}

async function collect(id: string): Promise<void> {
  const collected = await collectBatch(id, reach)
  if (!collected.ended) {
    process.stdout.write(`batch ${id} is ${collected.status}. Run pnpm corpus:word ${locale} again to collect it\n`)
    return
  }

  const { answered, failed } = collected
  const unusable = new Map(failed)
  const kept: Record<string, readonly string[]> = {}
  const spent = noSpend()

  for (const [word, one] of answered) {
    add(spent, one.spent)

    const meaning = readWordMeaning(one.text)
    const fault = meaning === null ? null : faultInMeaning(meaning, naming)

    if (meaning === null) unusable.set(word, 'nothing sent gives the word away')
    else if (fault !== null) unusable.set(word, `answered "${meaning}", which is ${fault}`)
    else kept[word] = [meaning]
  }

  // Written before the run file is dropped. A write that fails leaves the batch collectable again,
  // where dropping it first would lose answers that are already paid for.
  const { header, meanings } = JSON.parse(written) as { header: unknown; meanings: Record<string, readonly string[]> }
  writeFileSync(wordsFile, meaningsFile({ header, meanings: { ...meanings, ...kept } }))
  rmSync(runFile)

  process.stdout.write(`collected: ${Object.keys(kept).length} meanings, written to ${wordsFile}\n`)
  process.stdout.write(`still owed: ${owed.length - Object.keys(kept).length}, asked again by the next run\n`)
  if (unusable.size > 0) process.stdout.write(`left for a person: ${list([...unusable.keys()])}\n`)
  process.stdout.write(spentLine(spent))
}
