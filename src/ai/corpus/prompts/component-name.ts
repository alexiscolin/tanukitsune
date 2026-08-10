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
export const COMPONENT_NAME_VERSION = 2

// Flat and shallow, and strict so an unexpected key fails rather than passes.
export const componentName = z.strictObject({ name: z.string() })

// Built once rather than per request: the object carries a closure and nothing reads it twice.
const FORMAT = zodOutputFormat(componentName)

export type Part = {
  readonly character: string
  // The kanji this component builds, which is the evidence a name is judged on: a name that pictures
  // nothing those characters contain is a name for a different shape.
  readonly composes: readonly string[]
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
    `Examples: ${shown}.`,
    '',
    'These names are taken. Give a different one:',
    [...taken].sort().join(', '),
  ].join('\n')
}

export function componentNameRequest(prefix: string, part: Part): MessageCreateParamsNonStreaming {
  return {
    model: 'claude-opus-5',
    max_tokens: 256,
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
  const traditional =
    part.traditional === undefined
      ? ''
      : `\n<traditional_name>${part.traditional}</traditional_name>\nUse it where it already names the shape.`

  return `<part>${part.character}</part>\n<builds>${composes}</builds>${traditional}\n\nName the part.`
}
