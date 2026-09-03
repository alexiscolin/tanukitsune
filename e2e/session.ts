import { expect, type Page } from '@playwright/test'

import { DEMO_QUESTIONS } from '../src/core/demo-deck'
import type { Question } from '../src/core/review/question'
import type { AnswerRecord } from '../src/core/review/answer-record'
import { BACKUP_PATH } from '../src/core/routes'
import { copyFor } from '../src/core/site-copy'
import { OUTBOX_DATABASE, OUTBOX_STORE } from '../src/data/local/database'

// What both suites driving a session need of it, held once: which question the seeded deck asks
// where, how a card is answered, and the rows a real IndexedDB kept. `review.spec.ts` asks whether
// the queue is written and `sync.spec.ts` whether it empties, and a second spelling of any of the
// three would let one of them pass against a store or a card the application does not use.

export const COPY = copyFor('fr')

// The backup as Playwright matches it, which is a glob where the application holds a path. Spelled
// here for the reason routes.ts spells the path itself once: both suites intercept this route, and
// two globs would let one of them intercept nothing and pass.
export const BACKUP_ROUTE = `**${BACKUP_PATH}`

// The deck asks every meaning before any reading, so the first two cards are two subjects asked the
// same question rather than one subject asked twice.
export function asked(position: number): Question {
  const question = DEMO_QUESTIONS[position]
  if (question === undefined) throw new Error('The demo deck asks fewer questions than this.')

  return question
}

// The card is up and taking input. The field takes the focus on every card, so this is what says a
// page has finished arriving, and it is also the first thing answering one waits for.
export async function cardReady(page: Page, position: number) {
  await expect(page.getByLabel(COPY.review.prompt[asked(position).kind])).toBeFocused()
}

// Typed rather than filled, and graded from the keyboard: the deck takes the focus the moment a
// verdict stands, so neither the field nor the deck is reached by pointing at it. The deck also
// carries `aria-disabled` until something has been answered, and it is what the field sits inside.
//
// It returns once the answer has been given, and says nothing about what followed. What a caller
// waits for next is the question it is asking: the next card for one, the queue for the other.
export async function answerCard(page: Page, position: number) {
  await answerQuestion(page, asked(position))
}

// The same gesture against a question from any deck, the card in front being whichever the deck is
// dealing. `answerCard` is this one plus the seeded deck's answer to which question that is.
//
// It waits for its own field rather than for a position, since the kind is what the label says and
// a deck that is not the seeded one asks its readings at positions the seeded one does not.
export async function answerQuestion(page: Page, question: Question) {
  await expect(page.getByLabel(COPY.review.prompt[question.kind])).toBeFocused()
  await page.keyboard.type(question.accepted[0])
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: COPY.review.askSelfGrade })).toBeFocused()
  await page.keyboard.press('ArrowRight')
}

// What a store holds, read through a connection of the suite's own and closed before the rows are
// handed back: a connection left open blocks the version change a later page asks for.
//
// It never creates the database. An open that arrives before the application has made it would
// create it empty, at whatever version was asked for, and the application's upgrade would then never
// run: every store missing for the rest of that browser context. So an absent database and an absent
// store both read as nothing, which is also what lets a caller poll rather than fail on the race
// between a card taking focus and the effect that writes.
export function readStore<Row>(page: Page, store: string): Promise<readonly Row[]> {
  return page.evaluate(
    ([database, name]) =>
      new Promise<Row[]>((resolve, reject) => {
        void indexedDB.databases().then((made) => {
          if (!made.some((one) => one.name === database)) {
            resolve([])

            return
          }

          const opened = indexedDB.open(database)
          opened.onerror = () => reject(new Error('The local database did not open.'))
          opened.onsuccess = () => {
            const db = opened.result

            if (!db.objectStoreNames.contains(name)) {
              db.close()
              resolve([])

              return
            }

            const all = db.transaction(name).objectStore(name).getAll()
            all.onsuccess = () => {
              db.close()
              resolve(all.result as Row[])
            }
            all.onerror = () => {
              db.close()
              reject(new Error(`The ${name} store did not read.`))
            }
          }
        })
      }),
    [OUTBOX_DATABASE, store] as const,
  )
}

// The rows the loop queued, which is the one piece of local state nothing can rebuild.
export function written(page: Page): Promise<readonly AnswerRecord[]> {
  return readStore<AnswerRecord>(page, OUTBOX_STORE)
}

export function queueLength(page: Page): Promise<number> {
  return written(page).then((rows) => rows.length)
}
