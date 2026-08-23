import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

// What a word means where the dictionary states it in no language this corpus can use. It is the one
// place a meaning is not lifted out of a release, and it is still anchored to one: the characters the
// word is written with carry keys taken from a dictionary, and the word is read off those rather than
// invented. How many words stand there is in docs/corpus.md, which owns the count.
//
// The words left over are largely transparent compounds a release does not bother stating: 三人 is
// three and person, 五月 is five and month. That is why the parts are what travels, and why a word
// whose meaning does not follow from its parts is answered with nothing rather than with a guess.
//
// Bumped whenever what the model is sent changes, because `prompt_version` is a column on every corpus
// row and two runs sharing a version make the provenance false while looking satisfied.
export const WORD_MEANING_VERSION = 1

// Null where the parts do not give the word away, which is an answer and not a failure: a compound
// whose meaning has to be known rather than read is one for a person to write.
const wordMeaning = z.strictObject({ meaning: z.string().nullable() })

const FORMAT = zodOutputFormat(wordMeaning)

export function readWordMeaning(text: string): string | null {
  try {
    const said = wordMeaning.parse(JSON.parse(text)).meaning

    return said === null || said.trim() === '' ? null : said
  } catch {
    return null
  }
}

export type Unglossed = {
  readonly word: string
  // The characters the word is written with and the word each already carries here, which is the whole
  // of what the meaning is read off.
  readonly parts: readonly { readonly character: string; readonly key: string }[]
  // What the course teaches the word as. It travels as the target and never as text to reproduce, the
  // words themselves being the account's and staying out of every file this writes.
  readonly taught: readonly string[]
}

// Everything identical across a run, rendered once and shared by every request in it.
export function wordMeaningPrefix(language: string): string {
  return [
    `You give the ${language} meaning of a Japanese word, for a kanji course. A learner types that`,
    'meaning and is graded on it, so it is the plainest wording the word has and nothing more.',
    '',
    'You are given the word, the characters it is written with and the word each of those already',
    `carries in ${language}, and what the course teaches the word as. Carry the taught meaning into`,
    `${language}, using the parts to settle the wording. Where the two disagree, the taught meaning is`,
    'the one the reader answers on.',
    '',
    'Give the meaning on its own, with no article, no gloss and no parenthesis. Where the word means',
    'something its parts do not give away, give null rather than a guess: a wrong meaning is taught to',
    'every reader, and nothing is a word somebody writes by hand instead.',
  ].join('\n')
}

export function wordMeaningRequest(prefix: string, one: Unglossed): MessageCreateParamsNonStreaming {
  return {
    model: 'claude-opus-5',
    // The ceiling covers thinking and answer together, and this model thinks unless told not to, so a
    // ceiling sized for a few words alone comes back truncated.
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: prefix, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    output_config: { format: FORMAT },
    messages: [{ role: 'user', content: asks(one) }],
  }
}

// Every value that is not ours is delimited and labelled as something to read rather than something to
// do. The taught meanings come from somebody else's file.
function asks({ word, parts, taught }: Unglossed): string {
  const lines = [
    `<word>${word}</word>`,
    ...parts.map((one) => `<part character="${one.character}">${one.key}</part>`),
    ...taught.map((one) => `<taught>${one}</taught>`),
  ]

  return `${lines.join('\n')}\n\nGive the meaning.`
}
