import { expect, test, type Page } from '@playwright/test'

import { sessionPath } from '../src/core/routes'
import { ASSIGNMENT_STORE, OUTBOX_DATABASE, SUBJECT_STORE } from '../src/data/local/database'
import { toAssignment } from '../src/data/wanikani/payload'
import { accountURL } from '../playwright.config'
import { FAKE_REVIEWS } from './fake-account'
import { cardReady } from './session'

// What a session leaves behind on the device. Both routes read the source on the server per render
// today, so a session cannot start without a network at all; the cards it was dealt are the first
// half of the answer, and the shell the service worker serves is the second.
//
// It runs on the account server, the seeded deck being dealt from a constant and having nothing to
// cache.

const database = OUTBOX_DATABASE

// Read through a connection of the suite's own, closed before the rows are handed back: a connection
// left open blocks the next version change. The same shape `written` uses for the outbox.
function cached(page: Page, store: string): Promise<readonly { id: number }[]> {
  return page.evaluate(
    ([database, name]) =>
      new Promise<{ id: number }[]>((resolve, reject) => {
        const opened = indexedDB.open(database)
        opened.onerror = () => reject(new Error('The local database did not open.'))
        opened.onsuccess = () => {
          if (!opened.result.objectStoreNames.contains(name)) {
            opened.result.close()
            reject(new Error(`The local database holds no store called ${name}.`))

            return
          }

          const all = opened.result.transaction(name).objectStore(name).getAll()
          all.onsuccess = () => {
            opened.result.close()
            resolve(all.result as { id: number }[])
          }
          all.onerror = () => reject(new Error(`The ${name} store did not read.`))
        }
      }),
    [database, store] as const,
  )
}

test('a session dealt online leaves its subjects on the device', async ({ page }) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)
  await cardReady(page, 0)

  const held = await expect
    .poll(async () => (await cached(page, SUBJECT_STORE)).length, { timeout: 10_000 })
    .toBeGreaterThan(0)
    .then(() => cached(page, SUBJECT_STORE))

  // Every subject the sitting was dealt, by identifier: what the cache is for is dealing the same
  // sitting again with no network, so holding a shorter list is holding a session nobody can finish.
  const dealt = FAKE_REVIEWS.data.map(toAssignment).map((entry) => entry.subjectId)

  expect([...held.map((subject) => subject.id)].sort()).toEqual([...dealt].sort())
})

test('a session dealt online leaves what it was waiting on', async ({ page }) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)
  await cardReady(page, 0)

  await expect
    .poll(async () => (await cached(page, ASSIGNMENT_STORE)).length, { timeout: 10_000 })
    .toBe(FAKE_REVIEWS.data.length)
})
