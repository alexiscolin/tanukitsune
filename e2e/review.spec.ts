import { expect, test, type Page } from '@playwright/test'

import { BACKUP_PATH, sessionPath } from '../src/core/routes'
import { copyFor } from '../src/core/site-copy'
import { asked, written } from './outbox'

// The outbox, exercised through the browser's own IndexedDB rather than a substitute for it:
// the store is the browser's, so a stand-in would prove that the stand-in works.

// The backup is refused for every test here, so a row leaves the queue only where this file says
// it does: what empties it below is the deck restarting, and a drain that took the row first would
// let that pass without it. The drain is driven in `sync.spec.ts`, against the same store.
test.beforeEach(async ({ context }) => {
  await context.route(`**${BACKUP_PATH}`, (route) => route.abort())
})

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
  // Filled by the flush to the source, which does not exist: the backup stores the row and never
  // writes to it, so this stays empty for as long as nothing submits upstream.
  expect(rows[0]?.syncedAt).toBeNull()
})

// The deck restarting is what empties the queue, and a reload is the only restart there is. With
// the backup refused above, it is also the only thing that can have emptied it.
test('restarting the demo deck leaves an empty queue', async ({ page }) => {
  await page.goto(sessionPath('fr', 'review'))
  await answerFirstCard(page)
  await page.reload()

  await expect.poll(() => written(page).then((rows) => rows.length)).toBe(0)
})
