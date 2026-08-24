import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

import { corpusRequest } from '../request'

// The extension and the relative path are there for the reason inventory.ts states: the corpus
// commands run this file through Node rather than a bundler, where an alias resolves to nothing. It
// binds only a value import, a type one being erased before Node sees it.
import { isOrderOf } from '../../../core/corpus/key.ts'

// Which of a character's glosses is the word it should be taught under, asked one character at a time.
// The model orders what it is given and never writes a word: the key is still selected from a gloss
// the dictionary states, and uniqueness across the corpus stays a table's decision. Judgement is the
// only thing asked here, which is the split docs/corpus.md holds for the whole pipeline.
//
// Bumped whenever what the model is sent changes, because `prompt_version` is a column on every corpus
// row and two runs sharing a version make the provenance false while looking satisfied.
export const KEY_CHOICE_VERSION = 1

const keyChoice = z.strictObject({ order: z.array(z.string()) })

const FORMAT = zodOutputFormat(keyChoice)

// The answer read back against the glosses it was asked over. An order is a reordering and nothing
// else, so an answer that invents, drops or repeats one is refused and the dictionary's own order
// stands. Nothing rather than a throw: one bad answer is one character left in source order, where a
// throw would lose a batch that has already been paid for.
export function readKeyChoice(text: string, glosses: readonly string[]): readonly string[] | null {
  try {
    const { order } = keyChoice.parse(JSON.parse(text))

    return isOrderOf(order, glosses) ? order : null
  } catch {
    return null
  }
}

export type Weighed = {
  readonly character: string
  readonly glosses: readonly string[]
}

// Everything identical across a run, rendered once and shared by every request in it, so a byte moving
// here invalidates the cache for every request behind it.
export function keyChoicePrefix(language: string): string {
  return [
    `You order the meanings of a Japanese character for a ${language} kanji course. A learner meets the`,
    'character under one of them and answers on it for years, so the first has to be the sense the',
    'character most plainly carries, and the last the one it carries least.',
    '',
    'Order the glosses you are given, all of them, from most central to most marginal. Prefer a plain',
    'noun a learner can hold over a grammatical word, an abbreviation or a technical term. Return every',
    'gloss exactly as it was given, changing no letter and adding nothing.',
  ].join('\n')
}

export function keyChoiceRequest(prefix: string, weighed: Weighed): MessageCreateParamsNonStreaming {
  return corpusRequest(prefix, { format: FORMAT }, asks(weighed))
}

// Every value that is not ours is delimited and labelled as something to read rather than something to
// do. The glosses come from somebody else's file.
function asks({ character, glosses }: Weighed): string {
  const listed = glosses.map((gloss) => `<gloss>${gloss}</gloss>`).join('\n')

  return `<character>${character}</character>\n${listed}\n\nOrder the glosses.`
}
