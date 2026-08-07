import { expect, test } from '@playwright/test'

import { answerRecord } from '../src/core/review/answer-record'
import type { AnsweredCard, AnswerStamp } from '../src/core/review/answer-record'
import { BACKUP_PATH, BACKUP_SECRET_HEADER } from '../src/core/routes'
import { asOptional } from '../src/data/optional-text'

// The backup route against the database the application actually opens, because Postgres is
// never mocked here and `src/data/db.ts` cannot be imported by a unit test at all: it declares
// itself server-only, so this suite is where the insert and its replay are observable.
//
// The secret is the one the server under test was started with, read from the environment rather
// than written twice: a literal here would pass against a server holding another value. Through
// the same rule the application reads it by, so a blank line in the environment file is absence to
// both of them rather than a value to one.
const SECRET = asOptional(process.env['TANUKITSUNE_SYNC_SECRET']) ?? ''

const CARD: AnsweredCard = {
  subjectId: 451,
  kind: 'meaning',
  answer: 'dessous',
  verdict: 'correct',
  decidedBy: 'exact@1',
  said: 'correct',
  srsStageBefore: 2,
}

// A row per run, the table being append-only and shared with every other run on this database. A
// fixed identifier would make the second run of the suite read the first one's rows.
function queued(id: string): unknown {
  const stamp: AnswerStamp = {
    id,
    locale: 'fr',
    corpusVersion: null,
    answeredAt: new Date('2026-08-04T10:00:00.000Z'),
  }

  return JSON.parse(JSON.stringify(answerRecord(CARD, stamp)))
}

test('the backup refuses a request carrying no secret', async ({ request }) => {
  const response = await request.post(BACKUP_PATH, { data: [queued(crypto.randomUUID())] })

  expect(response.status()).toBe(401)
})

test('the backup refuses a request carrying the wrong secret', async ({ request }) => {
  const response = await request.post(BACKUP_PATH, {
    headers: { [BACKUP_SECRET_HEADER]: `${SECRET}-not-it` },
    data: [queued(crypto.randomUUID())],
  })

  expect(response.status()).toBe(401)
})

test('a queued answer becomes a durable row, and a replayed batch adds none', async ({
  request,
}) => {
  const batch = [queued(crypto.randomUUID()), queued(crypto.randomUUID())]
  const headers = { [BACKUP_SECRET_HEADER]: SECRET }

  const first = await request.post(BACKUP_PATH, { headers, data: batch })
  expect(first.status()).toBe(200)
  expect(await first.json()).toEqual({ appended: batch.length })

  const again = await request.post(BACKUP_PATH, { headers, data: batch })
  expect(again.status()).toBe(200)
  expect(await again.json()).toEqual({ appended: 0 })
})

test('the backup refuses a batch it cannot read', async ({ request }) => {
  const response = await request.post(BACKUP_PATH, {
    headers: { [BACKUP_SECRET_HEADER]: SECRET },
    data: [{ id: crypto.randomUUID() }],
  })

  expect(response.status()).toBe(400)
})
