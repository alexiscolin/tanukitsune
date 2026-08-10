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

export type Answered = {
  readonly text?: string
  // A safety decline arrives as a successful response with its own stop reason, so it is a result
  // rather than an error. A vocabulary corpus earns some, and each one is written by hand instead.
  readonly refused: boolean
  readonly model?: string
}

export type Reach = {
  readonly key: string
  // The host is a seam rather than a constant, as it is everywhere else that reaches a third party:
  // a client able to reach only the real one cannot be tested.
  readonly api: string
}

export async function submitBatch(asked: readonly Asked[], reach: Reach): Promise<string> {
  const batch = await clientFor(reach).messages.batches.create({
    requests: asked.map((one) => ({ custom_id: one.subject, params: one.params })),
  })

  return batch.id
}

export async function collectBatch(id: string, reach: Reach): Promise<ReadonlyMap<string, Answered>> {
  const client = clientFor(reach)
  const batch = await client.messages.batches.retrieve(id)

  if (batch.processing_status !== 'ended') throw new Error(`batch ${id} is ${batch.processing_status}`)

  const answered = new Map<string, Answered>()
  for await (const one of await client.messages.batches.results(id)) {
    if (one.result.type !== 'succeeded') continue

    answered.set(one.custom_id, read(one.result.message))
  }

  return answered
}

function read(message: { content: { type: string; text?: string }[]; stop_reason: string | null; model: string }) {
  if (message.stop_reason === 'refusal') return { refused: true, model: message.model }

  const text = message.content.find((block) => block.type === 'text')?.text

  return { text, refused: false, model: message.model }
}

function clientFor(reach: Reach): Anthropic {
  if (reach.key === '') throw new Error('ANTHROPIC_API_KEY is not set')

  return new Anthropic({ apiKey: reach.key, baseURL: reach.api })
}
