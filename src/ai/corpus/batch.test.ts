import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { collectBatch, submitBatch } from './batch'

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
  return { model: 'claude-opus-5', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }
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
    expect(sent.map((one) => one.custom_id)).toEqual(['九', 'ハ'])
  })

  it('refuses to run without a key rather than sending an unauthenticated request', async () => {
    await expect(submitBatch([{ subject: '九', params: asked('name it') }], { key: '', api: API })).rejects.toThrow(
      /key/i,
    )
  })
})

describe('collectBatch', () => {
  // Results arrive in any order, so they are keyed by the identifier that was sent rather than by
  // position. Reading them by position is the bug this test exists to make impossible.
  it('keys every result by its subject rather than by the order it arrives in', async () => {
    server.use(
      http.get(`${API}/v1/messages/batches/batch_1`, () =>
        HttpResponse.json({
          id: 'batch_1',
          processing_status: 'ended',
          results_url: `${API}/v1/messages/batches/batch_1/results`,
        }),
      ),
      http.get(`${API}/v1/messages/batches/batch_1/results`, () =>
        HttpResponse.text(
          [
            resultLine('ハ', 'la fourche'),
            resultLine('九', 'le neuf'),
          ].join('\n'),
        ),
      ),
    )

    const collected = await collectBatch('batch_1', { key: KEY, api: API })

    expect(collected.get('九')?.text).toBe('le neuf')
    expect(collected.get('ハ')?.text).toBe('la fourche')
  })

  // A refusal is not an exception: it comes back as a successful response with its own stop reason,
  // and code that reads the first content block before checking it breaks on the vocabulary that
  // trips a classifier.
  it('names a refusal instead of reading a content block that is not there', async () => {
    server.use(
      http.get(`${API}/v1/messages/batches/batch_1`, () =>
        HttpResponse.json({
          id: 'batch_1',
          processing_status: 'ended',
          results_url: `${API}/v1/messages/batches/batch_1/results`,
        }),
      ),
      http.get(`${API}/v1/messages/batches/batch_1/results`, () =>
        HttpResponse.text(
          JSON.stringify({
            custom_id: '殺',
            result: {
              type: 'succeeded',
              message: { content: [], stop_reason: 'refusal', model: 'claude-opus-5' },
            },
          }),
        ),
      ),
    )

    const collected = await collectBatch('batch_1', { key: KEY, api: API })

    expect(collected.get('殺')?.refused).toBe(true)
    expect(collected.get('殺')?.text).toBeUndefined()
  })
})

function resultLine(subject: string, text: string): string {
  return JSON.stringify({
    custom_id: subject,
    result: {
      type: 'succeeded',
      message: { content: [{ type: 'text', text }], stop_reason: 'end_turn', model: 'claude-opus-5' },
    },
  })
}
