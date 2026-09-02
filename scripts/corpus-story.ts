// The two stories and the nuance a card shows, written to corpus/<locale>/mnemonics.json. There are
// 23590 of them across the curriculum and 53 written by hand, which is the whole reason this exists.
//
// Run with `pnpm corpus:story [locale] [most]`, where `most` bounds a run so a first one can be read by
// hand before the rest is paid for. The key comes from `.env.local`, which the command loads itself:
// the application is handed it by the framework, and a plain Node run is not.
//
// A batch is asynchronous, so this is re-run rather than waited on, on the same terms as corpus:name.
//
// What comes back is judged by the rules the report holds a written story to, in the one place a test
// can reach them. A story naming a part it was not given, told out of order, or ending anywhere but on
// the meaning is refused and asked again rather than written.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import { collectBatch, submitBatch } from '../src/ai/corpus/batch.ts'
import { STORY_VERSION, readStory, storyPrefix, storyRequest } from '../src/ai/corpus/prompts/story.ts'
import { faultInReadingStory, faultInStory } from '../src/core/corpus/story.ts'
import {
  readAnchors,
  readComponentNames,
  readDecompositions,
  readKeys,
  readNaming,
  readStories,
  readTelling,
  storiesFile,
} from '../src/data/corpus/artifact.ts'
import { cardsFrom } from '../src/data/corpus/publish.ts'
import { walkCurriculum } from '../src/data/corpus/curriculum.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'
import { batchFor } from '../src/data/corpus/pipeline.ts'
import { add, nextStep, noSpend, readSubmitted, spentLine, submittedFile } from '../src/data/corpus/naming-run.ts'
import { spread } from '../src/data/corpus/anchor-run.ts'
import { asked, list } from './corpus-command.ts'

const { locale, most, reach } = asked(process.argv)
const at = (file: string) => `corpus/${locale}/${file}`
const toldFile = at('mnemonics.json')
const runFile = batchFor('corpus:story', locale)

for (const needed of [INVENTORY_FILE, 'corpus/decomposition.json', at('keys.json'), at('naming.json'), toldFile]) {
  if (!existsSync(needed)) throw new Error(`${needed} is missing. Run pnpm corpus to write it`)
}

const { subjects } = readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8'))
const decompositions = readDecompositions(readFileSync('corpus/decomposition.json', 'utf8'))
const names = existsSync(at('components.json')) ? readComponentNames(readFileSync(at('components.json'), 'utf8')) : {}
const keys = readKeys(readFileSync(at('keys.json'), 'utf8'))
const bound = existsSync(at('anchors.json')) ? readAnchors(readFileSync(at('anchors.json'), 'utf8')).bound : new Map()
const naming = readNaming(readFileSync(at('naming.json'), 'utf8'))
const telling = readTelling(readFileSync(at('naming.json'), 'utf8'))
const written = readStories(readFileSync(toldFile, 'utf8'))

const { read } = walkCurriculum(subjects, names, (character) => decompositions.get(character) ?? [])
const cards = cardsFrom(subjects, read, { names, keys, bound })

// A card is owed a run where it carries no meaning story, the meaning being the one text every card
// shows. A card whose reading is not bound is still asked for, and asked without a reading: the story
// it can carry is the other one.
const owed = [...cards.keys()].filter((character) => (written.get(character)?.meaning ?? '').trim() === '')

const saved = existsSync(runFile) ? readSubmitted(readFileSync(runFile, 'utf8')) : null
const step = nextStep(saved, spread(owed, most), STORY_VERSION)

if (step.do === 'submit') await submit(step.parts)
else if (step.do === 'collect') await collect(step.id)
else process.stdout.write(`${locale}: every card the curriculum deals carries its stories\n`)

async function submit(charactersAsked: readonly string[]): Promise<void> {
  const prefix = storyPrefix(naming.language)
  const asks = charactersAsked.flatMap((character) => {
    const card = cards.get(character)

    if (card === undefined) return []

    return [
      {
        subject: character,
        params: storyRequest(prefix, {
          character,
          key: card.key,
          parts: card.parts,
          reading: card.reading ?? '',
          anchor: card.anchor ?? '',
        }),
      },
    ]
  })

  const id = await submitBatch(asks, reach)
  writeFileSync(runFile, submittedFile({ id, version: STORY_VERSION }))

  process.stdout.write(`submitted: ${asks.length} of ${owed.length} cards owed their stories, batch ${id}\n`)
  process.stdout.write(`run pnpm corpus:story ${locale} again to collect it\n`)
}

async function collect(id: string): Promise<void> {
  const collected = await collectBatch(id, reach)

  if (!collected.ended) {
    process.stdout.write(`batch ${id} is ${collected.status}. Run pnpm corpus:story ${locale} again to collect it\n`)
    return
  }

  const { answered, failed } = collected
  const refused = new Map(failed)
  const kept = new Map<string, { readonly meaning: string; readonly nuance: string; readonly reading: string }>()
  const spent = noSpend()

  for (const [character, one] of answered) {
    add(spent, one.spent)

    const told = readStory(one.text)
    const card = cards.get(character)

    if (told === null || card === undefined) {
      refused.set(character, 'unreadable')
      continue
    }

    if (told.nuance.trim() === '') {
      refused.set(character, 'no nuance')
      continue
    }

    const fault = faultInStory({ text: told.meaning, parts: card.parts, key: card.key }, telling)

    if (fault !== null) {
      refused.set(character, `meaning: ${fault}`)
      continue
    }

    // Asked for only where a word is bound to the reading, so an empty one is the answer rather than a
    // refusal: a story resting on no word rests on nothing.
    if (card.reading === null || card.anchor === null) {
      kept.set(character, { meaning: told.meaning, nuance: told.nuance, reading: '' })
      continue
    }

    const heard = faultInReadingStory(
      {
        text: told.reading,
        anchor: card.anchor,
        reading: card.reading,
        cast: [...card.parts, card.key],
      },
      telling,
    )

    if (heard !== null) {
      refused.set(character, `reading: ${heard}`)
      continue
    }

    kept.set(character, told)
  }

  // Written before the run file is dropped. A write that fails leaves the batch collectable again,
  // where dropping it first would lose answers that are already paid for.
  writeFileSync(toldFile, storiesFile(readFileSync(toldFile, 'utf8'), kept))
  rmSync(runFile)

  process.stdout.write(`collected: ${kept.size} written, saved to ${toldFile}\n`)
  process.stdout.write(`still owed: ${owed.length - kept.size}, asked again by the next run\n`)
  process.stdout.write(`refused: ${list([...refused].map(([character, why]) => `${character} ${why}`))}\n`)
  process.stdout.write(spentLine(spent))
}
