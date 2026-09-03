import { expect, test, type Page } from '@playwright/test'

import { PAINT_BUDGET, PAINT_SPAN } from '../src/core/paint-budget'
import { sessionPath } from '../src/core/routes'
import { asked, cardReady, COPY } from './session'

// The budget v0.1 sets on the item card, read rather than asserted. The two ends are marked by the
// screen itself, so what is measured here is the span the reader waits through and not a proxy for
// it: a test timing its own round trip would measure Playwright.

// A word no card accepts, so every answer below is wrong. That is the case the criterion names and
// the heavier of the two: a correct verdict drops the field showing what was typed, so the card it
// opens renders less than the card this measures.
const WRONG = 'brouette'

// Answered wrongly and graded wrongly, which is the whole gesture: the deck takes the focus once a
// verdict stands, and left is the reader saying the answer was wrong.
async function answerWrongly(page: Page, position: number) {
  await cardReady(page, position)
  await page.keyboard.type(WRONG)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: COPY.review.askSelfGrade })).toBeFocused()
}

// Every span the screen has recorded so far, in milliseconds.
function spans(page: Page): Promise<readonly number[]> {
  return page.evaluate(
    (name) => performance.getEntriesByName(name, 'measure').map((entry) => entry.duration),
    PAINT_SPAN,
  )
}

// The ninety-fifth percentile by nearest rank, which is what the criterion names. A seeded deck is a
// small sample, so this is close to the worst card rather than to the typical one, which is the
// direction a budget should be read in.
function ninetyFifth(taken: readonly number[]): number {
  const sorted = [...taken].sort((one, two) => one - two)
  const rank = Math.ceil(sorted.length * 0.95)

  return sorted[rank - 1] as number
}

// The seeded deck asks every meaning before any reading, so these are all meaning questions and one
// French word answers them all wrongly.
const CARDS = 5

test('the card a wrong answer opens is painted inside the budget', async ({ page }) => {
  await page.goto(sessionPath('fr', 'review'))

  for (let position = 0; position < CARDS; position += 1) {
    await answerWrongly(page, position)
    // The span itself is what says the card is up, which is the thing being measured rather than a
    // stand-in for it: a locator would have to name some element of the sheet and wait on that.
    await expect.poll(() => spans(page).then((taken) => taken.length)).toBe(position + 1)
    await page.keyboard.press('ArrowLeft')
  }

  const taken = await spans(page)

  expect(taken).toHaveLength(CARDS)
  expect(asked(CARDS - 1).kind).toBe('meaning')
  expect(ninetyFifth(taken)).toBeLessThan(PAINT_BUDGET)
})
