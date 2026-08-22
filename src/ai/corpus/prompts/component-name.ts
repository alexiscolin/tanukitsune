import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

import type { Naming } from '@/core/corpus/name'

// What a component is called, asked one component at a time. Nothing here is about one language: the
// language, the shape a name takes and the examples all arrive as that locale's material, so a second
// language is a folder rather than a second prompt.
//
// Bumped whenever what the model is sent changes, because `prompt_version` is a column on every corpus
// row and two runs sharing a version make the provenance false while looking satisfied. The material
// counts as the wording, since changing it changes what was asked.
export const COMPONENT_NAME_VERSION = 5

// Flat and shallow, and strict so an unexpected key fails rather than passes.
export const componentName = z.strictObject({ name: z.string() })

// Built once rather than per request: the object carries a closure and nothing reads it twice.
const FORMAT = zodOutputFormat(componentName)

// The answer read back, beside the shape it was asked in so the two cannot drift apart. Nothing
// rather than a throw: one answer the model shaped wrong is one component left unnamed and asked
// again by the next run, where a throw would lose a batch that has already been paid for.
export function readComponentName(text: string): string | null {
  try {
    return componentName.parse(JSON.parse(text)).name
  } catch {
    return null
  }
}

export type Part = {
  // Null where the curriculum draws the part rather than writing it. Fifteen of them carry no
  // character, their artwork is the source's and is neither fetched nor read, so the shape below is
  // what stands in for it.
  readonly character: string | null
  // The kanji this component builds, which is the evidence a name is judged on: a name that pictures
  // nothing those characters contain is a name for a different shape.
  readonly composes: readonly string[]
  // What those characters share, taken from the drawing rather than from the source's picture. Present
  // only where they share anything: KanjiVG spells a part differently from one character to the next,
  // so four of the fifteen share nothing and are named from the characters alone.
  readonly shape?: readonly string[]
  readonly traditional?: string
}

// Everything identical across a run, rendered once and shared by every request in it. A byte moving
// here invalidates the cache for every request behind it, which is why the taken names are sorted
// rather than left in the order a map happened to yield.
export function componentNamePrefix(naming: Naming, taken: readonly string[]): string {
  const shown = naming.examples.map((one) => `${one.character} is "${one.name}"`).join(', ')
  const words = naming.mostWords

  return [
    `You name the parts of Japanese characters for a ${naming.language} kanji course. A learner meets`,
    'the part as a picture and then meets it again inside every character that contains it, so the name',
    'has to be a thing that can be seen and drawn.',
    '',
    `Give a ${naming.language} noun phrase that opens on one of ${naming.opensWith.join(', ')}, runs to`,
    `${words} words at most after that, and joins its words with ${joiners(naming.joiners)} or a space.`,
    `Pick what the shape looks like, and prefer a word that suits the characters the part builds.`,
    'Never name the part after what one of those characters means. A learner meets the part as a picture',
    'and has to recognise it by that picture, and a part named after a character it builds gives that',
    "character a story saying it is made of itself, which teaches nothing.",
    'Where the course draws the part instead of writing it, no part is given: the characters it builds',
    'are, and the strokes they share where they share any, and the name is taken from those.',
    `Examples: ${shown}.`,
    '',
    'These names are taken. Give a different one:',
    [...taken].sort().join(', '),
  ].join('\n')
}

export function componentNameRequest(prefix: string, part: Part): MessageCreateParamsNonStreaming {
  return {
    model: 'claude-opus-5',
    // The ceiling covers thinking and answer together, and this model thinks unless told not to, so a
    // ceiling sized for a noun phrase is spent before the phrase is written and every request in the
    // batch comes back truncated. Room for both, since an unused ceiling costs nothing.
    max_tokens: 4096,
    // Stated rather than left to the default, because the default differs between models in this
    // family and the difference is the truncation above.
    thinking: { type: 'adaptive' },
    // An hour rather than the default five minutes, because a batch routinely runs longer than that
    // and a prefix that expires mid-run is written again and read by nothing.
    system: [{ type: 'text', text: prefix, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    output_config: { format: FORMAT },
    messages: [{ role: 'user', content: asks(part) }],
  }
}

// A space is a joiner and it has no shape on a page, so it is named rather than shown in a list where
// it would read as an empty item.
function joiners(all: string): string {
  return [...all]
    .filter((one) => one !== ' ')
    .map((one) => `"${one}"`)
    .join(' or ')
}

// Every value that is not ours is delimited and labelled as something to read rather than something to
// do. The traditional name is the one that carries prose, and it comes from somebody else's file.
function asks(part: Part): string {
  const composes = part.composes.length === 0 ? 'nothing on its own' : part.composes.join(' ')
  const written = part.character === null ? '' : `<part>${part.character}</part>\n`
  const shared = (part.shape ?? []).map((one) => `<shared>${one}</shared>`).join('\n')
  const traditional =
    part.traditional === undefined
      ? ''
      : `\n<traditional_name>${part.traditional}</traditional_name>\nUse it where it already names the shape.`

  return `${written}<builds>${composes}</builds>\n${shared}${traditional}\n\nName the part.`
}
