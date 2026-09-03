import { expect, test, type Page } from '@playwright/test'

import { CARD_PAINTED, PAINT_BUDGET } from '../src/core/paint-budget'
import { sessionPath } from '../src/core/routes'
import { answerCard, cardReady } from './session'

// The budget v0.1 sets on the item card, read rather than asserted. The two ends are marked by the
// screen itself, so what is measured here is the span the reader waits through and not a proxy for
// it: a test timing its own round trip would measure Playwright.

// Every span the screen has recorded so far, in milliseconds.
function spans(page: Page): Promise<readonly number[]> {
  return page.evaluate(
    (name) => performance.getEntriesByName(name, 'measure').map((entry) => entry.duration),
    CARD_PAINTED,
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

test('the item card is painted inside the budget', async ({ page }) => {
  await page.goto(sessionPath('fr', 'review'))

  // Answered rather than given up on: what the criterion measures is the card a wrong answer opens,
  // and the deck grades from the keyboard once a verdict stands.
  const cards = 5

  for (let position = 0; position < cards; position += 1) {
    await cardReady(page, position)
    await answerCard(page, position)
    // The span itself is what says the card is up, which is the thing being measured rather than a
    // stand-in for it: a locator would have to name some element of the sheet and wait on that.
    await expect.poll(() => spans(page).then((taken) => taken.length)).toBe(position + 1)
    await page.keyboard.press('ArrowRight')
  }

  const taken = await spans(page)

  expect(taken.length).toBeGreaterThanOrEqual(cards)
  expect(ninetyFifth(taken)).toBeLessThan(PAINT_BUDGET)
})
