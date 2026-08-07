import { expect, test, type Page } from '@playwright/test'

import { BACKUP_PATH, sessionPath } from '../src/core/routes'
import { answerCard, asked, queueLength, written } from './session'

// The outbox, exercised through the browser's own IndexedDB rather than a substitute for it:
// the store is the browser's, so a stand-in would prove that the stand-in works.

const FIRST = asked(0)
const SECOND = asked(1)

// The deck advancing is what says the answer was accepted, and it is the half of this file's first
// question that the queue cannot answer.
async function answerFirstCard(page: Page) {
  await answerCard(page, 0)
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

// The deck restarting is what empties the queue, and a reload is the only restart there is.
test('restarting the demo deck leaves an empty queue', async ({ page, context }) => {
  // The backup is refused for this test alone, so the restart is the only thing that can have
  // emptied the queue. Refusing it for the file would take the drain out of the run above, which
  // is the configuration the product ships.
  await context.route(`**${BACKUP_PATH}`, (route) => route.abort())

  await page.goto(sessionPath('fr', 'review'))
  await answerFirstCard(page)
  await page.reload()

  await expect.poll(() => queueLength(page)).toBe(0)
})
