import { expect, test } from '@playwright/test'

import { sessionPath, startPath } from '../src/core/routes'
import { copyFor } from '../src/core/site-copy'
import { DECK_STORE } from '../src/data/local/database'
import type { HeldDeck } from '../src/data/local/database'
import { accountURL, sourceURL } from '../playwright.config'
import { readStore } from './session'

// What the cache is for: the reader has already opened a session, and the account cannot be
// reached. The cards come from the device rather than from a screen that will not render.
//
// The source is made unreachable rather than made to refuse, because a refusal is an answer and a
// status this client is right to treat as a defect. What this covers is no answer at all.

const COPY = copyFor('fr')

async function reachable(request: { get: (url: string) => Promise<unknown> }, is: boolean) {
  await request.get(`${sourceURL}/unreachable?is=${is ? 'false' : 'true'}`)
}

test.afterEach(async ({ request }) => {
  await reachable(request, true)
})

// Installable, which is what puts the app on a home screen and what takes its storage out of
// Safari's seven-day eviction. The install itself is the manual pass on a physical device, which
// docs/verification.md holds as the release gate; what is checkable here is what it is offered.
test('the app offers itself for installation, opening where a session starts', async ({
  request,
}) => {
  const answered = await request.get(`${accountURL}/manifest.webmanifest`)

  expect(answered.ok()).toBe(true)

  const manifest = (await answered.json()) as {
    start_url: string
    display: string
    icons: { sizes: string }[]
  }

  // Where a session starts rather than inside one, which is the criterion.
  expect(manifest.start_url).toBe(startPath('fr'))
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512'])
})

test('a session opens and deals with no network at all', async ({ page, context }) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)
  await expect(page.getByLabel(COPY.review.prompt.meaning)).toBeFocused()

  // The worker holds the shell, and the device holds the sitting. Waited for rather than assumed:
  // a worker that has not taken control yet answers nothing.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await expect
    .poll(async () => (await readStore<HeldDeck>(page, DECK_STORE)).length, { timeout: 10_000 })
    .toBe(1)

  await context.setOffline(true)
  await page.reload()

  // The document came from the worker and the cards from the device. Nothing about the screen says
  // so, which is the point: a session that opens is a session, whatever answered.
  await expect(page.getByLabel(COPY.review.prompt.meaning)).toBeFocused()
})

test('a sitting already held is dealt when the account cannot be reached', async ({
  page,
  request,
}) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)
  await expect(page.getByLabel(COPY.review.prompt.meaning)).toBeFocused()

  // The write is what the next load reads, so the spec waits for it rather than for the card alone.
  await expect
    .poll(async () => (await readStore<HeldDeck>(page, DECK_STORE)).length, { timeout: 10_000 })
    .toBe(1)

  await reachable(request, false)
  await page.reload()

  // The same first card, dealt from the device. Nothing about the screen says where it came from,
  // which is the point: a session that opens is a session, whatever answered.
  await expect(page.getByLabel(COPY.review.prompt.meaning)).toBeFocused()
})
