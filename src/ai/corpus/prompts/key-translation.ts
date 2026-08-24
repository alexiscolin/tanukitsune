import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

import { corpusRequest } from '../request'

// The word a character is taught under where the release leaves it with none this corpus can use. This
// is the one place a key is not lifted out of a dictionary, and it is still anchored to one: the
// English meaning the release does state is carried across rather than a meaning being invented. How
// many characters stand there is in docs/corpus.md, which owns the count.
//
// What comes back is a word and not a decision. Whether the locale can write it is judged by
// `faultInKey`, and whether it is free is the table's as ever.
//
// Bumped whenever what the model is sent changes, because `prompt_version` is a column on every corpus
// row and two runs sharing a version make the provenance false while looking satisfied.
export const KEY_TRANSLATION_VERSION = 3

const keyTranslation = z.strictObject({ key: z.string() })

const FORMAT = zodOutputFormat(keyTranslation)

export function readKeyTranslation(text: string): string | null {
  try {
    return keyTranslation.parse(JSON.parse(text)).key
  } catch {
    return null
  }
}

export type Untranslated = {
  readonly character: string
  readonly english: readonly string[]
  // What the course teaches the character as, which is what the reader is graded on. The dictionary
  // orders its English by the classical Chinese sense first, so 諦 states truth before abandon while
  // the course teaches give up: carrying the dictionary's first word across teaches a meaning nobody
  // is ever asked for. It travels as the target and never as text to reproduce, the words themselves
  // being the account's and staying out of every file this writes.
  readonly taught: readonly string[]
}

// Everything identical across a run, rendered once and shared by every request in it. The words
// already answering for another character travel here, sorted rather than left in whatever order a map
// yielded, because a byte moving invalidates the cache for every request behind it.
export function keyTranslationPrefix(language: string, taken: readonly string[]): string {
  return [
    `You give the ${language} word a Japanese character is taught and answered under, for a kanji`,
    'course. A learner types that word and is graded on it, so it is the plainest one the character',
    'means and nothing more.',
    '',
    'You are given what the course teaches the character as, and the English meanings a dictionary',
    `states for it. Carry the taught meaning into ${language}. The dictionary meanings are there to`,
    'settle the wording where the taught one is broad, and never to replace it: where the two disagree,',
    'the taught meaning is the one the reader answers on. Give the word on its own, with no article, no',
    'gloss and no parenthesis.',
    '',
    'These words already answer for another character, and two characters answering to one word cannot',
    'be told apart. Give a different one, as close to the taught meaning as the language allows:',
    [...taken].sort().join(', '),
  ].join('\n')
}

export function keyTranslationRequest(prefix: string, one: Untranslated): MessageCreateParamsNonStreaming {
  return corpusRequest(prefix, { format: FORMAT }, asks(one))
}

// Every value that is not ours is delimited and labelled as something to read rather than something to
// do. The meanings come from somebody else's file.
function asks({ character, english, taught }: Untranslated): string {
  const lines = [
    `<character>${character}</character>`,
    ...taught.map((one) => `<taught>${one}</taught>`),
    ...english.map((one) => `<meaning>${one}</meaning>`),
  ]

  return `${lines.join('\n')}\n\nGive the word.`
}
