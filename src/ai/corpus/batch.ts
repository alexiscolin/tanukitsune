import Anthropic from '@anthropic-ai/sdk'
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'

// Submitting the corpus to the batch API and collecting what comes back. The job is keyed by subject
// throughout, because results arrive in any order and reading them by position is the failure that
// looks like a working run until somebody checks a card against its character.
//
// Nothing here knows what a card is. The prompt and the schema arrive above it and change none of
// these signatures, which is why the seam is drawn at the transport rather than at one call.

export type Asked = {
  // The subject the request is for, and the only thing that ties an answer back to its question.
  readonly subject: string
  readonly params: MessageCreateParamsNonStreaming
}

// The four counts, because the input count reports only the uncached remainder and a run that reads
// the first alone cannot tell a warm shared prefix from a cold one.
type Spent = {
  readonly input: number
  readonly output: number
  readonly cacheCreation: number
  readonly cacheRead: number
}

type Answered = {
  readonly text: string
  readonly model: string
  readonly spent: Spent
}

export type Collected = {
  readonly answered: ReadonlyMap<string, Answered>
  // Everything that came back without usable prose, keyed by subject and carrying why. It is what
  // the next batch re-submits, so a run that drops it silently is a corpus with holes that reads as
  // complete.
  readonly failed: ReadonlyMap<string, string>
}

export type Reach = {
  readonly key: string
  // The host is a seam rather than a constant, as it is everywhere else that reaches a third party:
  // a client able to reach only the real one cannot be tested. Absent is the real one.
  readonly api?: string
}

export async function submitBatch(asked: readonly Asked[], reach: Reach): Promise<string> {
  const batch = await clientFor(reach).messages.batches.create(
    { requests: asked.map((one) => ({ custom_id: one.subject, params: one.params })) },
    // A batch the server accepted and then lost on the wire would be submitted twice, and the first
    // one runs and bills with nobody holding its identifier. Sending once and failing is cheaper.
    { maxRetries: 0 },
  )

  return batch.id
}

export async function collectBatch(id: string, reach: Reach): Promise<Collected> {
  const client = clientFor(reach)
  const batch = await client.messages.batches.retrieve(id)

  if (batch.processing_status !== 'ended') throw new Error(`batch ${id} is ${batch.processing_status}`)

  const answered = new Map<string, Answered>()
  const failed = new Map<string, string>()

  for await (const one of await client.messages.batches.results(id)) {
    if (one.result.type !== 'succeeded') {
      failed.set(one.custom_id, one.result.type)
      continue
    }

    const read = readMessage(one.result.message)
    if (typeof read === 'string') failed.set(one.custom_id, read)
    else answered.set(one.custom_id, read)
  }

  return { answered, failed }
}

// An answer, or the one word saying why there is none. A safety decline arrives as a successful
// response with its own stop reason, so reading a content block before checking it is what breaks on
// the anatomy and violence a vocabulary corpus contains. A truncated answer is refused for the same
// reason it would be refused later: half a mnemonic teaches half a thing.
function readMessage(message: Anthropic.Message): Answered | string {
  if (message.stop_reason === 'refusal') return 'refusal'
  if (message.stop_reason === 'max_tokens') return 'truncated'

  const text = message.content.find((block) => block.type === 'text')?.text
  if (text === undefined) return 'no text'

  return { text, model: message.model, spent: spentOn(message.usage) }
}

function spentOn(usage: Anthropic.Usage): Spent {
  return {
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheCreation: usage.cache_creation_input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
  }
}

function clientFor(reach: Reach): Anthropic {
  if (reach.key === '') throw new Error('an API key is required to reach the model')

  return new Anthropic({ apiKey: reach.key, ...(reach.api === undefined ? {} : { baseURL: reach.api }) })
}
