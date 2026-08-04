import { expect, test, type Page } from '@playwright/test'

import { DEMO_QUESTIONS } from '../src/core/demo-deck'
import type { Question } from '../src/core/review/question'
import type { AnswerRecord } from '../src/core/review/answer-record'
import { OUTBOX_DATABASE, OUTBOX_STORE } from '../src/data/local/outbox'
import { sessionPath } from '../src/core/routes'
import { copyFor } from '../src/core/site-copy'

// The outbox, exercised through the browser's own IndexedDB rather than a substitute for it:
// the store is the browser's, so a stand-in would prove that the stand-in works.

const COPY = copyFor('fr')

// The deck asks every meaning before any reading, so the first two cards are two subjects
// asked the same question rather than one subject asked twice.
function asked(position: number): Question {
  const question = DEMO_QUESTIONS[position]
  if (question === undefined) throw new Error('The demo deck asks fewer questions than this.')

  return question
}

const FIRST = asked(0)
const SECOND = asked(1)

// The rows as the application wrote them, read through a connection of the suite's own. It is
// closed before the rows are handed back: a connection left open blocks the version change the day
// the store gains its second one.
function written(page: Page): Promise<readonly AnswerRecord[]> {
  return page.evaluate(
    ([database, store]) =>
      new Promise<AnswerRecord[]>((resolve, reject) => {
        const opened = indexedDB.open(database)
        opened.onerror = () => reject(new Error('The local database did not open.'))
        opened.onsuccess = () => {
          const all = opened.result.transaction(store).objectStore(store).getAll()
          all.onsuccess = () => {
            opened.result.close()
            resolve(all.result as AnswerRecord[])
          }
          all.onerror = () => reject(new Error('The outbox did not read.'))
        }
      }),
    [OUTBOX_DATABASE, OUTBOX_STORE] as const,
  )
}

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
