import { expect, type Page } from '@playwright/test'

import { DEMO_QUESTIONS } from '../src/core/demo-deck'
import type { Question } from '../src/core/review/question'
import type { AnswerRecord } from '../src/core/review/answer-record'
import { copyFor } from '../src/core/site-copy'
import { OUTBOX_DATABASE, OUTBOX_STORE } from '../src/data/local/outbox'

// What both suites driving a session need of it, held once: which question the seeded deck asks
// where, how a card is answered, and the rows a real IndexedDB kept. `review.spec.ts` asks whether
// the queue is written and `sync.spec.ts` whether it empties, and a second spelling of any of the
// three would let one of them pass against a store or a card the application does not use.

const COPY = copyFor('fr')

// The deck asks every meaning before any reading, so the first two cards are two subjects asked the
// same question rather than one subject asked twice.
export function asked(position: number): Question {
  const question = DEMO_QUESTIONS[position]
  if (question === undefined) throw new Error('The demo deck asks fewer questions than this.')

  return question
}

// Typed rather than filled, and graded from the keyboard: the field takes the focus on every card
// and the deck takes it the moment a verdict stands, so neither is reached by pointing at it. The
// deck also carries `aria-disabled` until something has been answered, and it is what the field
// sits inside.
//
// It returns once the answer has been given, and says nothing about what followed. What a caller
// waits for next is the question it is asking: the next card for one, the queue for the other.
export async function answerCard(page: Page, position: number) {
  const question = asked(position)

  await expect(page.getByLabel(COPY.review.prompt[question.kind])).toBeFocused()
  await page.keyboard.type(question.accepted[0])
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: COPY.review.askSelfGrade })).toBeFocused()
  await page.keyboard.press('ArrowRight')
}

// The rows as the application wrote them, read through a connection of the suite's own. It is
// closed before the rows are handed back: a connection left open blocks the version change the day
// the store gains its second one.
export function written(page: Page): Promise<readonly AnswerRecord[]> {
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

// What both suites poll while they wait for the queue to fill or to empty.
export function queueLength(page: Page): Promise<number> {
  return written(page).then((rows) => rows.length)
}
