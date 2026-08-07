import { expect, test, type Page } from '@playwright/test'

import { sessionPath } from '../src/core/routes'
import { copyFor } from '../src/core/site-copy'
import { asked, written } from './outbox'

// The outbox, exercised through the browser's own IndexedDB rather than a substitute for it:
// the store is the browser's, so a stand-in would prove that the stand-in works.

const COPY = copyFor('fr')

const FIRST = asked(0)
const SECOND = asked(1)

// Typed rather than filled, and graded from the keyboard: the field takes the focus on every
// card and the deck takes it the moment a verdict stands, so neither is reached by pointing at
// it. The deck also carries `aria-disabled` until something has been answered, and it is what
// the field sits inside.
async function answerFirstCard(page: Page) {
  await expect(page.getByLabel(COPY.review.prompt[FIRST.kind])).toBeFocused()
  await page.keyboard.type(FIRST.accepted[0])
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: COPY.review.askSelfGrade })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(SECOND.subject.characters ?? '')
}

test('an answer is in the browser database before the deck advances', async ({ page }) => {
  await page.goto(sessionPath('fr', 'review'))
  await answerFirstCard(page)

  const rows = await written(page)

  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    subjectId: FIRST.subject.id,
    kind: FIRST.kind,
    answer: FIRST.accepted[0],
    verdict: 'correct',
    correct: true,
  })
  // Nothing leaves the device in demo mode, so the field the flush fills is empty.
  expect(rows[0]?.syncedAt).toBeNull()
})

// Demo mode runs the real write and submits nothing, so the queue it leaves behind is not a
// queue anybody drains. The deck restarting is what empties it, and a reload is the only
// restart there is.
test('restarting the demo deck leaves an empty queue', async ({ page }) => {
  await page.goto(sessionPath('fr', 'review'))
  await answerFirstCard(page)
  await page.reload()

  await expect.poll(() => written(page).then((rows) => rows.length)).toBe(0)
})
