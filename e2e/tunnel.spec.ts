import { expect, test, type Locator, type Page } from '@playwright/test'

import { DEMO_DECK, DEMO_SUBJECTS_ASKED } from '../src/core/demo-deck'
import { sessionPath, startPath } from '../src/core/routes'
import { copyFor } from '../src/core/site-copy'
import { FLOWS } from '../src/core/subject'
import type { Subject } from '../src/core/subject'
import { violationsOn } from './audit'

// The way in and the way out. Every step inside a session is covered by review.spec.ts and by
// the unit tests; what is checked here is that a session is entered from the screen the installed
// app opens on, that its end leads back there rather than nowhere, and that both flows pass the
// audit where they are served rather than only as states in the catalogue.

const COPY = copyFor('fr')

// What the card in front shows of its subject, which is the only card the accessibility tree
// carries: the one behind it is hidden and inert. A radical the source sends with no Unicode
// character arrives as artwork named by its meaning, so that is what names it here too.
function faceOf(page: Page, subject: Subject): Locator {
  if (subject.characters !== null)
    return page.getByRole('heading', { level: 1, name: subject.characters })

  return page.getByRole('img', { name: subject.meanings[0]?.text ?? '' })
}

// Counted in subjects rather than in questions, which is the number the source's own client shows
// and the one the reader recognises: a kanji asked for its meaning and then its reading is one
// item due, not two.
test('the start screen says what is waiting in each flow', async ({ page }) => {
  await page.goto(startPath('fr'))

  // The counts one request after the document, the page being one shell for every reader: a
  // figure dash stands in until they arrive, and asserting on arrival is asserting on that.
  await expect(page.getByRole('link', { name: new RegExp(COPY.start.flow.lesson) })).toContainText(
    `${DEMO_DECK.length}`,
  )
  await expect(page.getByRole('link', { name: new RegExp(COPY.start.flow.review) })).toContainText(
    `${DEMO_SUBJECTS_ASKED}`,
  )
})

test('a lesson is entered from the start screen and its end leads back to it', async ({ page }) => {
  await page.goto(startPath('fr'))
  await page.getByRole('link', { name: new RegExp(COPY.start.flow.lesson) }).click()

  await expect(page).toHaveURL(/\/fr\/session\?flow=lesson$/)

  // The deck takes the focus on every card, so the batch is paged through from the keyboard and
  // nothing here points at a card to reach it. Each card is left only once it has arrived: the
  // deck holds the one in front for the length of its exit and drops what is pressed during it,
  // so a batch paged through blind stops on the second card.
  for (const subject of DEMO_DECK) {
    await expect(faceOf(page, subject)).toBeVisible()
    await page.keyboard.press('ArrowRight')
  }

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(COPY.review.done)

  await page.getByRole('link', { name: COPY.review.back }).click()

  await expect(page).toHaveURL(/\/fr$/)
})

test('a review is entered from the start screen and opens on its first question', async ({
  page,
}) => {
  await page.goto(startPath('fr'))
  await page.getByRole('link', { name: new RegExp(COPY.start.flow.review) }).click()

  await expect(page).toHaveURL(/\/fr\/session\?flow=review$/)
  // The deck asks every meaning before any reading, so the first card is a meaning whatever
  // the deck grows to, and the field being focused is what says the review has started.
  await expect(page.getByLabel(COPY.review.prompt.meaning)).toBeFocused()
})

// The loop assembled under its layout, which is what no story can audit: a state rendered in the
// catalogue's frame carries neither the document's landmarks nor the identifiers the shell and the
// deck share. It moved here when the loop stopped being what `/[locale]` serves.
test('both flows are accessible where they are actually served', async ({ page }) => {
  const [first] = DEMO_DECK
  if (first === undefined) throw new Error('The seeded deck deals nothing.')

  for (const flow of FLOWS) {
    await page.goto(sessionPath('fr', flow))
    // The cards before the audit. The page is one shell for everyone and the sitting arrives one
    // request after the document, so auditing on arrival is auditing an empty body.
    await expect(faceOf(page, first)).toBeVisible()

    expect(await violationsOn(page)).toEqual([])
  }
})

// No step of the loop is reached by navigating, which includes a session nobody said the flow
// of: a route that guessed one would start a session the reader did not ask for.
test('a session with no flow named is not found', async ({ page }) => {
  const response = await page.goto(`${startPath('fr')}/session`)

  expect(response?.status()).toBe(404)
})
