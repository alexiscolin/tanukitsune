import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { collectBatch, submitBatch } from './batch'
import { CORPUS_MODEL } from './request'

// A server that answers like theirs, which is what MSW is here for: it mocks third-party HTTP and
// never our own data layer. What is checked is what only a real request can be wrong about, the
// model that was asked for, the identifier each request carries, and results arriving out of order.

const API = 'https://api.anthropic.com'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

const KEY = 'nobody-owns-this'

function asked(prompt: string): MessageCreateParamsNonStreaming {
  return { model: CORPUS_MODEL, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }
}

describe('submitBatch', () => {
  it('sends one request per subject, each carrying the subject as its identifier', async () => {
    let sent: { custom_id: string }[] = []
    server.use(
      http.post(`${API}/v1/messages/batches`, async ({ request }) => {
        const body = (await request.json()) as { requests: { custom_id: string }[] }
        sent = body.requests
        return HttpResponse.json({ id: 'batch_1', processing_status: 'in_progress' })
      }),
    )

    const id = await submitBatch(
      [
        { subject: '九', params: asked('name it') },
        { subject: 'ハ', params: asked('name it') },
      ],
      { key: KEY, api: API },
    )

    expect(id).toBe('batch_1')
    expect(sent.map((one) => one.custom_id)).toEqual(['4e5d', '30cf'])
  })

  // The API accepts an identifier matching this and nothing else, so a subject travels as its code
  // points. A mocked server takes any string, which is why the shape is asserted here rather than
  // discovered on the first real submission.
  it('identifies a request by something the API will accept', async () => {
    let sent: { custom_id: string }[] = []
    server.use(
      http.post(`${API}/v1/messages/batches`, async ({ request }) => {
        const body = (await request.json()) as { requests: { custom_id: string }[] }
        sent = body.requests
        return HttpResponse.json({ id: 'batch_1', processing_status: 'in_progress' })
      }),
    )

    await submitBatch(
      ['九', 'ハ', '留守番電話', '\u4e00'].map((subject) => ({ subject, params: asked('name it') })),
      { key: KEY, api: API },
    )

    for (const one of sent) expect(one.custom_id).toMatch(/^[a-zA-Z0-9_-]{1,64}$/)
  })

  it('refuses to run without a key rather than sending an unauthenticated request', async () => {
    await expect(submitBatch([{ subject: '九', params: asked('name it') }], { key: '', api: API })).rejects.toThrow(
      /key/i,
    )
  })
})

describe('collectBatch', () => {
  // A batch still running is an answer rather than a fault: the run file still holds its identifier
  // and the next invocation collects it. Throwing made an operator read a stack trace for the one
  // outcome that is entirely normal.
  it('reports a batch that has not ended rather than throwing', async () => {
    server.use(running())

    await expect(collectBatch('batch_1', { key: KEY, api: API })).resolves.toEqual({
      ended: false,
      status: 'in_progress',
    })
  })

  // Results arrive in any order, so they are keyed by the identifier that was sent rather than by
  // position. Reading them by position is the bug this test exists to make impossible.
  it('keys every result by its subject rather than by the order it arrives in', async () => {
    server.use(
      ended(),
      results([resultLine('ハ', 'la fourche'), resultLine('九', 'le neuf')]),
    )

    const collected = await ofEnded()

    expect(collected.answered.get('九')?.text).toBe('le neuf')
    expect(collected.answered.get('ハ')?.text).toBe('la fourche')
  })

  // The input count reports only the uncached remainder, so a run reading it alone cannot tell a warm
  // shared prefix from a cold one, which is the number the whole batch's cost turns on.
  it('carries the four token counts rather than the one that under-reports', async () => {
    server.use(ended(), results([resultLine('九', 'le neuf')]))

    const collected = await ofEnded()

    expect(collected.answered.get('九')?.spent).toEqual({
      input: 12,
      output: 34,
      cacheCreation: 56,
      cacheRead: 78,
    })
  })

  // A result that never produced prose is what the next batch re-submits. Dropping it leaves a corpus
  // with holes that reads as complete, which is the failure nobody notices until a card is missing.
  it('keeps what came back without prose in a failed set rather than dropping it', async () => {
    server.use(
      ended(),
      results([
        JSON.stringify({ custom_id: idFor('殺'), result: { type: 'errored', error: { type: 'invalid_request' } } }),
        JSON.stringify({ custom_id: idFor('匕'), result: { type: 'expired' } }),
      ]),
    )

    const collected = await ofEnded()

    expect(collected.answered.size).toBe(0)
    expect(collected.failed.get('殺')).toBe('errored')
    expect(collected.failed.get('匕')).toBe('expired')
  })

  // Half a mnemonic teaches half a thing, so a truncated answer is refused where it is read rather
  // than written and found later.
  it('refuses a truncated answer instead of storing half of one', async () => {
    server.use(ended(), results([resultLine('九', 'le ne', 'max_tokens')]))

    const collected = await ofEnded()

    expect(collected.answered.size).toBe(0)
    expect(collected.failed.get('九')).toBe('truncated')
  })

  // A refusal is not an exception: it comes back as a successful response with its own stop reason,
  // and code that reads the first content block before checking it breaks on the vocabulary that
  // trips a classifier.
  it('names a refusal instead of reading a content block that is not there', async () => {
    server.use(
      ended(),
      results([
        JSON.stringify({
          custom_id: idFor('殺'),
          result: {
            type: 'succeeded',
            message: { content: [], stop_reason: 'refusal', model: CORPUS_MODEL },
          },
        }),
      ]),
    )

    const collected = await ofEnded()

    expect(collected.answered.size).toBe(0)
    expect(collected.failed.get('殺')).toBe('refusal')
  })
})

// The ended shape, narrowed once here so every test below reads a result rather than a union.
async function ofEnded() {
  const collected = await collectBatch('batch_1', { key: KEY, api: API })
  if (!collected.ended) throw new Error('the batch was expected to have ended')

  return collected
}

function running() {
  return http.get(`${API}/v1/messages/batches/batch_1`, () =>
    HttpResponse.json({ id: 'batch_1', processing_status: 'in_progress' }),
  )
}

function ended() {
  return http.get(`${API}/v1/messages/batches/batch_1`, () =>
    HttpResponse.json({
      id: 'batch_1',
      processing_status: 'ended',
      results_url: `${API}/v1/messages/batches/batch_1/results`,
    }),
  )
}

function results(lines: readonly string[]) {
  return http.get(`${API}/v1/messages/batches/batch_1/results`, () => HttpResponse.text(lines.join('\n')))
}

// The identifier the API accepts, which is what the transport sends and reads back.
function idFor(subject: string): string {
  return [...subject].map((one) => (one.codePointAt(0) ?? 0).toString(16)).join('-')
}

function resultLine(subject: string, text: string, stop = 'end_turn'): string {
  return JSON.stringify({
    custom_id: idFor(subject),
    result: {
      type: 'succeeded',
      message: {
        content: [{ type: 'text', text }],
        stop_reason: stop,
        model: CORPUS_MODEL,
        usage: {
          input_tokens: 12,
          output_tokens: 34,
          cache_creation_input_tokens: 56,
          cache_read_input_tokens: 78,
        },
      },
    },
  })
}
