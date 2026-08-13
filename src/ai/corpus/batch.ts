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

// A batch still running and a batch that ended are two outcomes rather than one outcome and a fault,
// since submitting one and reading it later is the whole shape of the thing. They are told apart by a
// field a caller has to read, so a run cannot mistake a job still going for a job that answered
// nothing and drop the identifier that would have collected it.
export type Collected =
  | { readonly ended: false; readonly status: string }
  | {
      readonly ended: true
      readonly answered: ReadonlyMap<string, Answered>
      // Everything that came back without usable prose, keyed by subject and carrying why. It is what
      // the next batch re-submits, so a run that drops it silently is a corpus with holes that reads
      // as complete.
      readonly failed: ReadonlyMap<string, string>
    }

export type Reach = {
  readonly key: string
  // The host is a seam rather than a constant, as it is everywhere else that reaches a third party:
  // a client able to reach only the real one cannot be tested. Absent is the real one.
  readonly api?: string
}

// A request is identified by something matching ^[a-zA-Z0-9_-]{1,64}$, which a character is not, so a
// subject travels as its code points and comes back the same way. Reversible, so the collection needs
// no table beside the batch and the job stays keyed by subject from end to end.
function idFor(subject: string): string {
  return [...subject].map((one) => (one.codePointAt(0) ?? 0).toString(16)).join('-')
}

function subjectFor(id: string): string {
  return id
    .split('-')
    .map((one) => String.fromCodePoint(Number.parseInt(one, 16)))
    .join('')
}

export async function submitBatch(asked: readonly Asked[], reach: Reach): Promise<string> {
  const batch = await clientFor(reach).messages.batches.create(
    { requests: asked.map((one) => ({ custom_id: idFor(one.subject), params: one.params })) },
    // A batch the server accepted and then lost on the wire would be submitted twice, and the first
    // one runs and bills with nobody holding its identifier. Sending once and failing is cheaper.
    { maxRetries: 0 },
  )

  return batch.id
}

export async function collectBatch(id: string, reach: Reach): Promise<Collected> {
  const client = clientFor(reach)
  const batch = await client.messages.batches.retrieve(id)

  if (batch.processing_status !== 'ended') return { ended: false, status: batch.processing_status }

  const answered = new Map<string, Answered>()
  const failed = new Map<string, string>()

  for await (const one of await client.messages.batches.results(id)) {
    const subject = subjectFor(one.custom_id)

    if (one.result.type !== 'succeeded') {
      failed.set(subject, one.result.type)
      continue
    }

    const read = readMessage(one.result.message)
    if (typeof read === 'string') failed.set(subject, read)
    else answered.set(subject, read)
  }

  return { ended: true, answered, failed }
}

// An answer, or the one word saying why there is none. A safety decline arrives as a successful
// response with its own stop reason, so reading a content block before checking it is what breaks on
// the anatomy and violence a vocabulary corpus contains. A truncated answer is refused for the same
// reason it would be refused later: half a mnemonic teaches half a thing.
function readMessage(message: Anthropic.Message): Answered | string {
  if (message.stop_reason === 'refusal') return 'refusal'
  if (message.stop_reason === 'max_tokens' || message.stop_reason === 'model_context_window_exceeded') {
    return 'truncated'
  }

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
