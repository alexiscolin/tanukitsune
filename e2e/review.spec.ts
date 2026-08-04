import { expect, test, type Page } from '@playwright/test'

import { DEMO_QUESTIONS } from '../src/core/demo-deck'
import { OUTBOX_DATABASE, OUTBOX_STORE } from '../src/data/local/outbox'
import { copyFor } from '../src/core/site-copy'

// The outbox, exercised through the browser's own IndexedDB rather than a substitute for it:
// the store is the browser's, so a stand-in would prove that the stand-in works.

const COPY = copyFor('fr')

// The deck asks every meaning before any reading, so the first two cards are two subjects
// asked the same question rather than one subject asked twice.
const [FIRST, SECOND] = DEMO_QUESTIONS
if (FIRST === undefined || SECOND === undefined) throw new Error('The demo deck asks nothing.')

type Row = {
  readonly subjectId: number
  readonly kind: string
  readonly answer: string | null
  readonly verdict: string | null
  readonly correct: boolean
  readonly syncedAt: Date | null
}

function written(page: Page): Promise<readonly Row[]> {
  return page.evaluate(
    ([database, store]) =>
      new Promise<Row[]>((resolve, reject) => {
        const opened = indexedDB.open(database)
        opened.onerror = () => reject(new Error('The local database did not open.'))
        opened.onsuccess = () => {
          const all = opened.result.transaction(store).objectStore(store).getAll()
          all.onsuccess = () => resolve(all.result as Row[])
          all.onerror = () => reject(new Error('The outbox did not read.'))
        }
      }),
    [OUTBOX_DATABASE, OUTBOX_STORE] as const,
  )
}

async function answerFirstCard(page: Page) {
  const field = page.getByLabel(COPY.review.prompt[FIRST.kind])
  await field.fill(FIRST.accepted[0])
  await field.press('Enter')
  await page.getByRole('group', { name: COPY.review.askSelfGrade }).press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(SECOND.subject.characters ?? '')
}

test('an answer is in the browser database before the deck advances', async ({ page }) => {
  await page.goto('/fr')
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
  await page.goto('/fr')
  await answerFirstCard(page)
  await page.reload()

  await expect.poll(() => written(page).then((rows) => rows.length)).toBe(0)
})
