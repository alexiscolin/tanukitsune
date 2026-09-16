import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { answerRecord } from '../src/core/review/answer-record'
import type { AnsweredCard, AnswerStamp } from '../src/core/review/answer-record'
import { BACKUP_PATH, BACKUP_SECRET_COOKIE, HISTORY_PATH, KEY_PATH, startPath } from '../src/core/routes'
import { asOptional } from '../src/data/optional-text'
import { accountURL } from '../playwright.config'

// Two readers against one database, which is the whole of what a key has to get right: a row one of
// them wrote is theirs, and the other cannot flush it or delete it. The count a deletion answers with
// is what makes that observable at all, nothing else here reporting how many rows an account holds.
//
// Driven from inside the page rather than from the runner: the cookies a key produces are `Secure`, and
// only the browser treats this origin as secure enough to keep them and send them back.
//
// It answers the account server, for the reason account.spec.ts does: that is the one pointed at a
// source, and a key is checked by using it.
const SECRET = asOptional(process.env['TANUKITSUNE_SYNC_SECRET']) ?? ''

const CARD: AnsweredCard = {
  subjectId: 451,
  kind: 'meaning',
  answer: 'dessous',
  verdict: 'correct',
  decidedBy: 'exact:2',
  said: 'correct',
  srsStageBefore: 2,
}

// A row per run, the table being append-only and shared with every other run on this database.
function queued(id: string): unknown {
  const stamp: AnswerStamp = {
    id,
    locale: 'fr',
    corpusVersion: null,
    submits: true,
  answeredAt: new Date('2026-09-16T10:00:00.000Z'),
  }

  return JSON.parse(JSON.stringify(answerRecord(CARD, stamp)))
}

async function asked(page: Page, path: string, method: string, body: unknown): Promise<unknown> {
  return page.evaluate(
    async (call: { at: string; verb: string; sent: unknown }): Promise<unknown> => {
      const answered = await fetch(call.at, {
        method: call.verb,
        headers: call.sent === null ? {} : { 'content-type': 'application/json' },
        body: call.sent === null ? null : JSON.stringify(call.sent),
      })

      return answered.json()
    },
    { at: path, verb: method, sent: body },
  )
}

test('a reader writes their own rows, and takes only their own back', async ({ browser }) => {
  const asReader = async (key: string): Promise<Page> => {
    const context = await browser.newContext()
    await context.addCookies([{ name: BACKUP_SECRET_COOKIE, value: SECRET, url: accountURL }])

    const page = await context.newPage()
    await page.goto(`${accountURL}${startPath('fr')}`)
    expect(await asked(page, KEY_PATH, 'POST', { key })).toMatchObject({ username: 'nobody' })

    return page
  }

  const one = await asReader('reader-one')
  const other = await asReader('reader-two')

  expect(
    await asked(one, BACKUP_PATH, 'POST', [queued(crypto.randomUUID()), queued(crypto.randomUUID())]),
  ).toEqual({ appended: 2 })
  expect(await asked(other, BACKUP_PATH, 'POST', [queued(crypto.randomUUID())])).toEqual({ appended: 1 })

  // Each deletion answers for one account. That the other reader's rows are untouched is what the
  // second one proves: it still finds its own.
  expect(await asked(other, HISTORY_PATH, 'DELETE', null)).toEqual({ removed: 1 })
  expect(await asked(one, HISTORY_PATH, 'DELETE', null)).toEqual({ removed: 2 })

  await one.context().close()
  await other.context().close()
})

test('a browser naming an account it cannot prove deletes nothing', async ({ browser }) => {
  const context = await browser.newContext()
  await context.addCookies([
    { name: BACKUP_SECRET_COOKIE, value: SECRET, url: accountURL },
    { name: 'tanukitsune-account', value: '{"id":"fake-reader-one","username":"nobody","level":3}', url: accountURL },
  ])

  const page = await context.newPage()
  await page.goto(`${accountURL}${startPath('fr')}`)

  const refused = await page.evaluate(
    async (at) => (await fetch(at, { method: 'DELETE' })).status,
    HISTORY_PATH,
  )

  expect(refused).toBe(401)

  await context.close()
})
