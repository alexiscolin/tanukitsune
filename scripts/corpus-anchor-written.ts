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
import { faultInAnchor } from '../src/core/corpus/anchor-answer.ts'
import { soundsOf, spread, wantedFrom } from '../src/data/corpus/anchor-run.ts'
import { keyOrderFile, readAnchors, readKeyOrder, readLexicon, readNaming, readPhonology, readReadings } from '../src/data/corpus/artifact.ts'
import { batchFor } from '../src/data/corpus/pipeline.ts'
import { add, nextStep, noSpend, readSubmitted, spentLine, submittedFile } from '../src/data/corpus/naming-run.ts'
import { asked, list } from './corpus-command.ts'

const { locale, most, reach } = asked(process.argv)
const at = (file: string) => `corpus/${locale}/${file}`
const carriedFile = at('anchor-written.json')
const runFile = batchFor('corpus:anchor-written', locale)

for (const needed of ['corpus/.readings.json', at('.lexicon.json'), at('phonology.json'), carriedFile]) {
  if (!existsSync(needed)) throw new Error(`${needed} is missing. Run pnpm corpus to write it`)
}

// The two read each other, as corpus:keys and corpus:key-translation do: this asks for the readings the
// table failed on, and the table reads back what it wrote. Before the first binding there is nothing to
// have failed, so a run here is a run with nothing owed rather than a fault.
if (!existsSync(at('anchors.json'))) {
  process.stdout.write(`${locale}: nothing is bound yet, so no reading is owed a word. Run pnpm corpus:anchor first\n`)
  process.exit(0)
}

const readings = readReadings(readFileSync('corpus/.readings.json', 'utf8'))
const lexicon = readLexicon(readFileSync(at('.lexicon.json'), 'utf8'))
const naming = readNaming(readFileSync(at('naming.json'), 'utf8'))
// The same ceiling and floor `corpus:anchor` holds, read from the same place rather than restated: a
// number written twice is a number that stops matching the day one locale moves it.
const { nearest, apart, hears, writes, atMostMorae, atLeastCommon, partsOfSpeech, atMostWords } = readPhonology(
  readFileSync(at('phonology.json'), 'utf8'),
)
const { bound, left } = readAnchors(readFileSync(at('anchors.json'), 'utf8'))
const carried = readKeyOrder(readFileSync(carriedFile, 'utf8'))

// A reading is owed a word either because nothing was found for it, or because what was found is so
// rare that the reader would meet a cue they have to learn first. The two are one problem seen twice.
const owed = [
  ...left.keys(),
  ...[...bound].filter(([, one]) => one.frequency < atLeastCommon).map(([reading]) => reading),
].filter((reading) => !carried.has(reading))

// The sounds each reading is judged on, which is what `corpus:anchor` compares against and not what the
// kana say on their own: a locale hears some sounds as others, and writes one it does not say. Both the
// sounds and the letter travel to the model, an answer judged on a rule it was never told being an
// answer refused for the asker's reason.
const sounds = new Map(wantedFrom(readings, atMostMorae, hears).map((one) => [one.value, one.phonemes] as const))

// A reading opening on a sound the locale writes without saying it is compared from the sound that
// follows, and its anchor has to carry the letter. Held to the readings that open on it, as the binding
// command holds it: applied to every reading, it judges one on a pronunciation the binder never uses.
const spelling = new Map<string, string>()
for (const [sound, letter] of writes) {
  for (const one of wantedFrom(readings, atMostMorae, new Map([...hears, [sound, '']]))) {
    if (sounds.get(one.value)?.[0] !== sound) continue

    sounds.set(one.value, one.phonemes)
    spelling.set(one.value, letter)
  }
}

const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, spread(owed, most), ANCHOR_VERSION)

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
      heard: (sounds.get(reading) ?? []).join(' '),
      spelled: spelling.get(reading) ?? '',
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
  // Every anchor already standing for a reading, with the sounds the lexicon derives for it, since an
  // answer is judged against them as well as against its own reading.
  const standing = [
    ...bound.values(),
    ...[...carried].flatMap(([, words]) => {
      const anchor = words[0]
      const phonemes = anchor === undefined ? null : soundsOf(anchor, lexicon)

      return anchor === undefined || phonemes === null ? [] : [{ anchor, phonemes }]
    }),
  ]
  const spent = noSpend()

  for (const [reading, one] of answered) {
    add(spent, one.spent)

    const phrase = readAnchor(one.text)?.trim().toLowerCase()
    if (phrase === undefined) {
      refused.set(reading, 'unreadable')
      continue
    }

    // Judged by the rule the table applies to the anchors it chooses itself, in the one place a test can
    // reach it: a rule the asker states in prose and the collector applies in code drifts, and a drift
    // nothing can reach is a drift found by paying for a batch.
    const said = sounds.get(reading)
    if (said === undefined) {
      refused.set(reading, `${phrase}: no reading of that name is owed one`)
      continue
    }

    const words = phrase.split(/\s+/).flatMap((word) => {
      const held = lexicon.get(word)

      return held === undefined ? [] : [held]
    })

    // Everything standing except the anchor this reading already has, which is the word this run was
    // paid to replace: the two sound like the same reading, so they are the likeliest pair in the corpus
    // to sit under the limit, and a proposal refused for being near its own predecessor is paid for twice.
    const replacing = bound.get(reading)
    const fault = faultInAnchor(
      {
        proposal: phrase,
        heard: soundsOf(phrase, lexicon),
        words,
        said,
        spelledWith: spelling.get(reading) ?? '',
        replacing: replacing?.frequency ?? null,
      },
      standing.filter((one) => one.anchor !== replacing?.anchor),
      { nearest, apart, atMostWords, partsOfSpeech },
    )

    if (fault !== null) {
      refused.set(reading, `${phrase}: ${fault}`)
      continue
    }

    standing.push({ anchor: phrase, phonemes: soundsOf(phrase, lexicon) ?? [] })
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
