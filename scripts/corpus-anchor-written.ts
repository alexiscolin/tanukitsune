// The word a reading is bound to where the lexicon leaves it with none worth having: either no word the
// rules accept is still free, or the only one left is so rare that the cue would have to be learned
// before it could help. Written to corpus/<locale>/anchor-written.json, which `corpus:anchor` reads
// before its own passes rather than instead of them, so a reading reaches this file once the table has
// been asked and has failed.
//
// Run with `pnpm corpus:anchor-written [locale] [most]`, where `most` bounds a run so a first one can be
// read by hand before the rest is paid for. The key comes from `.env.local`, which the command loads
// itself: the application is handed it by the framework, and a plain Node run is not.
//
// A batch is asynchronous, so this is re-run rather than waited on, on the same terms as corpus:name.
//
// What a proposal brings that the table cannot is a phrase, the table searching words one at a time.
// What it may not bring is a pronunciation: every word of what comes back is looked up in the lexicon
// and the sounds are derived, so a word the lexicon does not hold is refused rather than trusted.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { toRomaji } from 'wanakana'

import { collectBatch, submitBatch } from '../src/ai/corpus/batch.ts'
import { ANCHOR_VERSION, anchorPrefix, anchorRequest, readAnchor } from '../src/ai/corpus/prompts/anchor.ts'
import { agreesAtTheStart, distanceBetween } from '../src/core/corpus/anchor.ts'
import { soundsOf, wantedFrom } from '../src/data/corpus/anchor-run.ts'
import { keyOrderFile, readAnchors, readKeyOrder, readLexicon, readNaming, readPhonology, readReadings } from '../src/data/corpus/artifact.ts'
import { batchFor } from '../src/data/corpus/pipeline.ts'
import { add, nextStep, noSpend, readSubmitted, spentLine, submittedFile } from '../src/data/corpus/naming-run.ts'
import { asked, list } from './corpus-command.ts'

// The same ceiling and floor `corpus:anchor` holds, since this run judges what that one will read back.
const MOST_MORAE = 4
const AT_LEAST = 1

const { locale, most, reach } = asked(process.argv)
const at = (file: string) => `corpus/${locale}/${file}`
const carriedFile = at('anchor-written.json')
const runFile = batchFor('corpus:anchor-written', locale)

for (const needed of ['corpus/.readings.json', at('.lexicon.json'), at('phonology.json'), at('anchors.json'), carriedFile]) {
  if (!existsSync(needed)) throw new Error(`${needed} is missing. Run pnpm corpus:anchor first, which writes what this asks about`)
}

const readings = readReadings(readFileSync('corpus/.readings.json', 'utf8'))
const lexicon = readLexicon(readFileSync(at('.lexicon.json'), 'utf8'))
const naming = readNaming(readFileSync(at('naming.json'), 'utf8'))
const { nearest, apart, hears, writes } = readPhonology(readFileSync(at('phonology.json'), 'utf8'))
const { bound, left } = readAnchors(readFileSync(at('anchors.json'), 'utf8'))
const carried = readKeyOrder(readFileSync(carriedFile, 'utf8'))

// A reading is owed a word either because nothing was found for it, or because what was found is so
// rare that the reader would meet a cue they have to learn first. The two are one problem seen twice.
const owed = [
  ...left.keys(),
  ...[...bound].filter(([, one]) => one.frequency < AT_LEAST).map(([reading]) => reading),
].filter((reading) => !carried.has(reading))

// The sounds each reading is judged on, which is what `corpus:anchor` compares against and not what the
// kana say on their own: a locale hears some sounds as others, and writes one it does not say.
const sounds = new Map(
  [
    ...wantedFrom(readings, MOST_MORAE, hears),
    ...[...writes.keys()].flatMap((sound) => wantedFrom(readings, MOST_MORAE, new Map([[sound, '']]))),
  ].map((one) => [one.value, one.phonemes] as const),
)

const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, owed.slice(0, most), ANCHOR_VERSION)

if (step.do === 'submit') await submit(step.parts)
else if (step.do === 'collect') await collect(step.id)
else process.stdout.write(`${locale}: every reading the lexicon left without a word has one written for it\n`)

async function submit(readingsAsked: readonly string[]): Promise<void> {
  const taken = [...bound.values()].map((one) => one.anchor)
  const prefix = anchorPrefix(naming.language, taken)
  const asks = readingsAsked.map((reading) => ({
    subject: reading,
    params: anchorRequest(prefix, {
      reading,
      said: toRomaji(reading),
      taught: readings.get(reading)?.by ?? [],
    }),
  }))

  const id = await submitBatch(asks, reach)
  writeFileSync(runFile, submittedFile({ id, version: ANCHOR_VERSION }))

  process.stdout.write(`submitted: ${asks.length} of ${owed.length} readings to write a word for, batch ${id}\n`)
  process.stdout.write(`run pnpm corpus:anchor-written ${locale} again to collect it\n`)
}

async function collect(id: string): Promise<void> {
  const collected = await collectBatch(id, reach)
  if (!collected.ended) {
    process.stdout.write(`batch ${id} is ${collected.status}. Run pnpm corpus:anchor-written ${locale} again to collect it\n`)
    return
  }

  const { answered, failed } = collected
  const refused = new Map(failed)
  const kept = new Map<string, readonly string[]>()
  // Every word already standing for a reading, the phrases broken into the words they are made of: a
  // phrase sharing a word with another anchor is two cues built on one thing.
  const holds = new Set(
    [...bound.values(), ...[...carried].map(([, words]) => ({ anchor: words[0] ?? '' }))].flatMap((one) =>
      one.anchor.split(/\s+/),
    ),
  )
  const spent = noSpend()

  for (const [reading, one] of answered) {
    add(spent, one.spent)

    const phrase = readAnchor(one.text)?.trim().toLowerCase()
    if (phrase === undefined || phrase === '') {
      refused.set(reading, 'unreadable')
      continue
    }

    // Judged here rather than written and found later. Each of these is the reason the table refused
    // something, applied to what was proposed instead: the proposal widens the search and never the rules.
    const said = sounds.get(reading)
    const heard = soundsOf(phrase, lexicon)
    if (said === undefined) {
      refused.set(reading, `${phrase}: no reading of that name is owed one`)
      continue
    }
    if (heard === null) {
      refused.set(reading, `${phrase}: the lexicon holds no such word, so nothing can pronounce it`)
      continue
    }
    if (phrase.split(/\s+/).length > naming.mostWords + 1) {
      refused.set(reading, `${phrase}: more words than a cue carries`)
      continue
    }
    if (!agreesAtTheStart(said, heard)) {
      refused.set(reading, `${phrase}: does not begin on the sound the reading does`)
      continue
    }

    const far = distanceBetween(said, heard)
    if (far > nearest) {
      refused.set(reading, `${phrase}: ${far.toFixed(2)} away, past ${nearest}`)
      continue
    }

    const already = phrase.split(/\s+/).find((word) => holds.has(word))
    if (already !== undefined) {
      refused.set(reading, `${phrase}: ${already} already stands for another reading`)
      continue
    }

    const near = [...bound.values()].find((other) => distanceBetween(other.phonemes, heard) < apart)
    if (near !== undefined) {
      refused.set(reading, `${phrase}: sits nearer than ${apart} to ${near.anchor}`)
      continue
    }

    for (const word of phrase.split(/\s+/)) holds.add(word)
    kept.set(reading, [phrase])
  }

  // Written before the run file is dropped. A write that fails leaves the batch collectable again,
  // where dropping it first would lose answers that are already paid for.
  writeFileSync(carriedFile, keyOrderFile(readFileSync(carriedFile, 'utf8'), kept))
  rmSync(runFile)

  process.stdout.write(`collected: ${kept.size} written, saved to ${carriedFile}\n`)
  process.stdout.write(`still owed: ${owed.length - kept.size}, asked again by the next run\n`)
  process.stdout.write(`refused: ${list([...refused].map(([reading, why]) => `${reading} ${why}`))}\n`)
  process.stdout.write(spentLine(spent))
  process.stdout.write(`run pnpm corpus:anchor ${locale} to bind them\n`)
}
