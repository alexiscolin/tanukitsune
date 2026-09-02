import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

import { corpusRequest } from '../request.ts'

// The three texts a card shows: what the character means, what that word does not carry, and how the
// character is read. There are 23590 of them across the curriculum and 53 are written by hand, which
// is the whole reason this exists.
//
// What comes back is judged by `faultInStory` and `faultInReadingStory` before anything is written, on
// exactly the rules stated here: a rule the asker states in prose and the collector applies in code
// drifts, and a drift nothing can reach is one found by paying for a batch.
//
// Bumped whenever what the model is sent changes, because `prompt_version` is a column on every corpus
// row and two runs sharing a version make the provenance false while looking satisfied.
export const STORY_VERSION = 1

const story = z.strictObject({ meaning: z.string(), nuance: z.string(), reading: z.string() })

const FORMAT = zodOutputFormat(story)

export type Answer = { readonly meaning: string; readonly nuance: string; readonly reading: string }

export function readStory(text: string): Answer | null {
  try {
    return story.parse(JSON.parse(text))
  } catch {
    return null
  }
}

export type Unwritten = {
  readonly character: string
  // What the character means in this language, which the meaning story ends on.
  readonly key: string
  // What it is made of, named as this language names it, in the order the drawing places them. The
  // story names each one and in that order, since a story is how the reader writes the character back.
  readonly parts: readonly string[]
  // The reading the card teaches and the word it is bound to. Both empty where nothing is bound, and
  // the reading story is then not asked for: a story resting on no word rests on nothing.
  readonly reading: string
  readonly anchor: string
}

// Everything identical across a run, rendered once and shared by every request in it.
export function storyPrefix(language: string): string {
  return [
    `You write the two short stories a kanji card shows, in ${language}, for a course whose learner`,
    'has already met every part named to you and answers with the word given as the meaning.',
    '',
    'The meaning story names each part, in the order they are given, and ends on the meaning. One',
    'interaction, made strange enough to be noticed, with something felt, heard or smelled inside it:',
    'what is felt is recalled where what is merely seen is not. Nothing else enters it. A second idea',
    'clouds the link far faster than a strange one does.',
    '',
    'The reading story continues that same scene with the same cast, so one scene carries both answers.',
    'It opens on the word the reading is bound to, before anything else from the scene, and it arrives',
    'at the reading. The word is what the learner says to recover the sound, so name it again at the',
    'end, beside the reading itself, and write the reading in the characters it is given in rather than',
    'in the letters of this language.',
    '',
    'The nuance is one clause saying what the meaning word does not carry, and naming the',
    `${language} word it must not be taken for where one exists. Where none does, say what the word`,
    'covers and stop.',
    '',
    'What every one of them has to be:',
    '1. A part is named by the exact word given for it. The learner knows it under that word and under',
    '   no other, and a word given for another part names that part rather than this one.',
    '2. Plain register, and a stranger could read it over the learner shoulder. The story is strange in',
    '   what happens, never in the words it is told in.',
    '3. Two sentences at most for each story, and one is usually better.',
    '4. Written to be read aloud: no parenthesis, no gloss, no note to the reader.',
    '',
    'Where no reading and no word are given, leave the reading story empty and write the other two.',
  ].join('\n')
}

// The ceiling the anchor prompt takes, for the same reason: this asks for prose rather than a lookup,
// and an answer cut off is a request paid for and thrown away.
const CEILING = 16384

export function storyRequest(prefix: string, one: Unwritten): MessageCreateParamsNonStreaming {
  return corpusRequest(prefix, FORMAT, asks(one), CEILING)
}

// Every value that is not ours is delimited and labelled as something to read rather than something to
// do. The character comes from somebody else's file.
function asks({ character, key, parts, reading, anchor }: Unwritten): string {
  const lines = [
    `<character>${character}</character>`,
    `<meaning>${key}</meaning>`,
    ...parts.map((one) => `<part>${one}</part>`),
    ...(reading === '' ? [] : [`<reading>${reading}</reading>`]),
    ...(anchor === '' ? [] : [`<bound-to>${anchor}</bound-to>`]),
  ]

  return `${lines.join('\n')}\n\nWrite the stories.`
}
