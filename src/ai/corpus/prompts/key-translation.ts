import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

// The word a character is taught under where the release states no gloss in the locale at all. This is
// the one place a key is not lifted straight out of a dictionary, and it is still anchored to one: the
// English meaning the release does state is carried across rather than a meaning being invented. 153
// characters of the French curriculum stand there, 巾, 莫 and 龍 among them.
//
// What comes back is a word and not a decision. Whether the locale can write it is judged by
// `faultInKey`, and whether it is free is the table's as ever.
//
// Bumped whenever what the model is sent changes, because `prompt_version` is a column on every corpus
// row and two runs sharing a version make the provenance false while looking satisfied.
export const KEY_TRANSLATION_VERSION = 2

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

// Everything identical across a run, rendered once and shared by every request in it.
export function keyTranslationPrefix(language: string): string {
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
  ].join('\n')
}

export function keyTranslationRequest(prefix: string, one: Untranslated): MessageCreateParamsNonStreaming {
  return {
    model: 'claude-opus-5',
    // The ceiling covers thinking and answer together, and this model thinks unless told not to, so a
    // ceiling sized for a word alone comes back truncated.
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: prefix, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    output_config: { format: FORMAT },
    messages: [{ role: 'user', content: asks(one) }],
  }
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
