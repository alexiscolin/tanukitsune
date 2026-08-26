import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

import { corpusRequest } from '../request.ts'

// The word a reading is bound to where the lexicon leaves it with none worth having: either no word
// the rules accept is still free, or the only one left is so rare that the cue would have to be learned
// before it could help. How many readings stand there is in docs/corpus.md, which owns the count.
//
// What a proposal brings that the table cannot is a phrase. The table searches words one at a time and
// a reading of four morae is rarely one French word, so the space this opens is the one thing worth
// paying for here.
//
// What comes back is a word and nothing else. Whether it sounds like the reading is measured against
// the lexicon afterwards, and whether it is free is the table's as ever. The pronunciation is not asked
// for: it is derived, and a pronunciation nobody claimed is a pronunciation nobody can hallucinate.
//
// Bumped whenever what the model is sent changes, because `prompt_version` is a column on every corpus
// row and two runs sharing a version make the provenance false while looking satisfied.
export const ANCHOR_VERSION = 3

const anchor = z.strictObject({ anchor: z.string() })

const FORMAT = zodOutputFormat(anchor)

export function readAnchor(text: string): string | null {
  try {
    return anchor.parse(JSON.parse(text)).anchor
  } catch {
    return null
  }
}

export type Unanchored = {
  readonly reading: string
  // The reading written in the letters the reader's own language uses, so the sound is on the page
  // rather than behind a script the model has to voice for itself.
  readonly said: string
  // The sounds the run will measure the answer against, which are not always the sounds the kana say:
  // a locale hears some of them as others, and one it does not say at all it may still write. Sent
  // because an answer judged on a rule it was never told is an answer refused for the asker's reason.
  readonly heard: string
  // The letter the word has to be spelled with, where the reading begins on a sound the locale writes
  // without saying it. Empty where it begins on one the locale says.
  readonly spelled: string
  // What the reading is worth reaching for: the characters teaching it, so a proposal that has to
  // choose between two near words can choose the one that will sit in those stories.
  readonly taught: readonly string[]
}

// Everything identical across a run, rendered once and shared by every request in it. The words already
// standing for another reading travel here, sorted rather than left in whatever order a map yielded,
// because a byte moving invalidates the cache for every request behind it.
export function anchorPrefix(language: string, taken: readonly string[]): string {
  return [
    `You give a ${language} word or short phrase that a ${language} speaker hears a Japanese reading in,`,
    'for a kanji course. The learner meets the word in a story and recalls the reading from it, so it',
    'has to sound like the reading and be something that can be pictured.',
    '',
    'You are given the reading, the sounds it is measured on, and sometimes a letter the word carries.',
    'The sounds are what a speaker of this language hears in the reading, which is not always what the',
    `kana say: where a sound does not exist in ${language}, the nearest one it does make stands in, and`,
    'a sound the language writes without saying is left out of the sounds and named as the letter.',
    '',
    'What makes an answer usable, in order of what matters:',
    '1. It begins on exactly the first sound given and follows it closely. The answer is measured sound',
    '   by sound, so match the number of syllables to the number of sounds wherever you can.',
    '2. Where a letter is given, the answer is spelled with it. The sounds already leave it out: the',
    '   word is said without it and carries it where the reader looks.',
    `3. Every word of it is an ordinary ${language} noun a dictionary lists, in the singular.`,
    '4. It names something that can be seen: a thing, a creature, a place. A reader builds a picture',
    '   out of it and puts the picture in a story.',
    '5. Three words at most, and the shorter the better.',
    '6. It reads the way a schoolbook reads, and a stranger could look over the reader shoulder.',
    '',
    'These words already stand for another reading, and one word standing for two readings gives the',
    'reader one cue with two answers. Give a different one:',
    [...taken].sort().join(', '),
    '',
    'Give the word alone, with no article, no gloss and no parenthesis.',
  ].join('\n')
}

// Four times the ceiling the other prompts take. This one asks for a search through a language rather
// than a lookup in a file, and the model reads its way through before answering: half of one bounded
// run came back cut off, which is a request paid for and thrown away.
const CEILING = 16384

export function anchorRequest(prefix: string, one: Unanchored): MessageCreateParamsNonStreaming {
  return corpusRequest(prefix, FORMAT, asks(one), CEILING)
}

// Every value that is not ours is delimited and labelled as something to read rather than something to
// do. The characters come from somebody else's file.
function asks({ reading, said, heard, spelled, taught }: Unanchored): string {
  const lines = [
    `<reading>${reading}</reading>`,
    `<said>${said}</said>`,
    `<sounds>${heard}</sounds>`,
    ...(spelled === '' ? [] : [`<spelled-with>${spelled}</spelled-with>`]),
    ...taught.map((one) => `<taught-by>${one}</taught-by>`),
  ]

  return `${lines.join('\n')}\n\nGive the word.`
}
