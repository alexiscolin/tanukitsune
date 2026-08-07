import { expect, test, type Page } from '@playwright/test'

import { sessionPath } from '../src/core/routes'
import { DECK_STORE, OUTBOX_DATABASE } from '../src/data/local/database'
import type { HeldDeck } from '../src/data/local/database'
import { toAssignment } from '../src/data/wanikani/payload'
import { accountURL } from '../playwright.config'
import { FAKE_LESSONS, FAKE_REVIEWS } from './fake-account'
import { cardReady } from './session'

// What a session leaves behind on the device. Both routes read the source on the server per render
// today, so a session cannot start without a network at all; the sitting it was dealt is the first
// half of the answer, and the shell the service worker serves is the second.
//
// It runs on the account server: the seeded deck is a constant already in the bundle, and a demo
// render writes nothing at all.

// Read through a connection of the suite's own, closed before the rows are handed back: a connection
// left open blocks the version change every other spec's page then waits on. The same shape
// `written` uses for the outbox.
function held(page: Page): Promise<readonly HeldDeck[]> {
  return page.evaluate(
    ([database, store]) =>
      new Promise<HeldDeck[]>((resolve, reject) => {
        const opened = indexedDB.open(database)
        opened.onerror = () => reject(new Error('The local database did not open.'))
        opened.onsuccess = () => {
          if (!opened.result.objectStoreNames.contains(store)) {
            opened.result.close()
            reject(new Error(`The local database holds no store called ${store}.`))

            return
          }

          const all = opened.result.transaction(store).objectStore(store).getAll()
          all.onsuccess = () => {
            opened.result.close()
            resolve(all.result as HeldDeck[])
          }
          all.onerror = () => reject(new Error(`The ${store} store did not read.`))
        }
      }),
    [OUTBOX_DATABASE, DECK_STORE] as const,
  )
}

function heldFor(decks: readonly HeldDeck[], flow: string) {
  return decks.find((deck) => deck.flow === flow)
}

test('a session dealt online leaves its sitting on the device', async ({ page }) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)
  await cardReady(page, 0)

  await expect.poll(async () => (await held(page)).length, { timeout: 10_000 }).toBeGreaterThan(0)

  const review = heldFor(await held(page), 'review')
  const dealt = FAKE_REVIEWS.data.map(toAssignment).map((entry) => entry.subjectId)

  // Every subject the sitting was dealt, and what it was waiting on: dealing the same sitting again
  // with no network needs both, so holding a shorter list is holding a session nobody can finish.
  expect([...(review?.subjects ?? [])].map((subject) => subject.id).sort()).toEqual([...dealt].sort())
  expect(review?.waiting).toHaveLength(FAKE_REVIEWS.data.length)
})

// One record per flow, so the two sittings coexist: a reader who opens a lesson has not lost the
// review they could otherwise have finished offline. This is the case a single pair of stores could
// not hold, each render evicting the other's sitting.
test('a lesson and a review are held apart', async ({ page }) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)
  await cardReady(page, 0)
  await expect.poll(async () => (await held(page)).length, { timeout: 10_000 }).toBe(1)

  await page.goto(`${accountURL}${sessionPath('fr', 'lesson')}`)
  await expect.poll(async () => (await held(page)).length, { timeout: 10_000 }).toBe(2)

  const decks = await held(page)

  expect(heldFor(decks, 'review')?.waiting).toHaveLength(FAKE_REVIEWS.data.length)
  expect(heldFor(decks, 'lesson')?.waiting).toHaveLength(FAKE_LESSONS.data.length)
})

// Replaced whole rather than merged: a sitting written twice holds one record, not two, and not the
// union of both. What a browser evicts here costs a download, so nothing is worth merging for.
test('a sitting dealt twice is replaced rather than merged', async ({ page }) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)
  await cardReady(page, 0)
  await expect.poll(async () => (await held(page)).length, { timeout: 10_000 }).toBe(1)

  await page.reload()
  await cardReady(page, 0)

  const decks = await held(page)

  expect(decks).toHaveLength(1)
  expect(heldFor(decks, 'review')?.subjects).toHaveLength(FAKE_REVIEWS.data.length)
})
