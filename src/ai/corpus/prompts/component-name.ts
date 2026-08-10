import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'

// What a component is called in French, asked one component at a time. Bumped whenever the text below
// changes, because `prompt_version` is a column on every corpus row and two runs sharing a version
// make the provenance false while looking satisfied. `version.test.ts` refuses a change that forgets.
export const COMPONENT_NAME_VERSION = 1

// Flat and shallow, and strict so an unexpected key fails rather than passes.
export const componentName = z.strictObject({ name: z.string() })

type Naming = {
  readonly character: string
  // The kanji this component builds, which is the evidence a name is judged on: a name that pictures
  // nothing those characters contain is a name for a different shape.
  readonly composes: readonly string[]
  readonly traditional?: string
}

// Everything identical across a run sits here and is cached, and the component itself sits in the
// message that follows. A byte moving in this text invalidates the cache for every request after it,
// which is why the taken names are sorted rather than left in the order a map happened to yield.
function shared(taken: readonly string[]): string {
  return [
    'You name the parts of Japanese characters for a French kanji course. A learner meets the part as',
    'a picture and then meets it again inside every character that contains it, so the name has to be',
    'a thing that can be seen and drawn.',
    '',
    'Give a French noun phrase that opens on a definite article, runs to three words at most, and uses',
    "the straight apostrophe. Pick what the shape looks like, and prefer a word that suits the",
    'characters the part builds. Examples: 口 is "la bouche", 木 is "l\'arbre".',
    '',
    'These names are taken. Give a different one:',
    [...taken].sort().join(', '),
  ].join('\n')
}

export function componentNameRequest(taken: readonly string[], one: Naming): MessageCreateParamsNonStreaming {
  return {
    model: 'claude-opus-5',
    max_tokens: 256,
    system: [{ type: 'text', text: shared(taken), cache_control: { type: 'ephemeral' } }],
    output_config: { format: zodOutputFormat(componentName) },
    messages: [{ role: 'user', content: asks(one) }],
  }
}

// Every value that is not ours is delimited and labelled as something to read rather than something to
// do. The traditional name is the one that carries prose, and it comes from somebody else's file.
function asks(one: Naming): string {
  const composes = one.composes.length === 0 ? 'nothing on its own' : one.composes.join(' ')
  const traditional =
    one.traditional === undefined
      ? ''
      : `\n<traditional_name>${one.traditional}</traditional_name>\nUse it where it already names the shape.`

  return `<part>${one.character}</part>\n<builds>${composes}</builds>${traditional}\n\nName the part.`
}
