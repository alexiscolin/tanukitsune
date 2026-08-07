import { expect, test } from '@playwright/test'

import { sessionPath, startPath } from '../src/core/routes'
import { copyFor } from '../src/core/site-copy'
import { FAKE_LESSONS, FAKE_REVIEWS, firstReviewed } from './fake-account'
import { accountURL } from '../playwright.config'

// A session dealt from an account rather than from the seeded deck. Every other spec here drives
// the demo, which is the only deck a server holding no token can deal, so nothing upstream of it
// was driven at all: not the source's own HTTP, not the queues, not the flush that will read them.
//
// It answers its own server, on its own port, for the reason the catalogue does: the demo specs
// assert the seeded deck, and which deck is dealt is read from the token alone.

const COPY = copyFor('fr')

test('the start screen counts the account queues rather than the seeded deck', async ({ page }) => {
  await page.goto(`${accountURL}${startPath('fr')}`)

  await expect(page.getByRole('link', { name: new RegExp(COPY.start.flow.lesson) })).toContainText(
    `${FAKE_LESSONS.data.length}`,
  )
  await expect(page.getByRole('link', { name: new RegExp(COPY.start.flow.review) })).toContainText(
    `${FAKE_REVIEWS.data.length}`,
  )
  // The promise that nothing leaves the device is true of the seeded deck alone, and this server
  // deals an account, so the screen must not make it.
  await expect(page.getByText(COPY.start.demo)).toHaveCount(0)
})

test('a review asks the account subjects rather than the seeded deck', async ({ page }) => {
  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)

  await expect(page.getByLabel(COPY.review.prompt.meaning)).toBeFocused()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    firstReviewed().data.characters ?? '',
  )
})
