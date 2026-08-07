import type { Page } from '@playwright/test'

import { DEMO_QUESTIONS } from '../src/core/demo-deck'
import type { Question } from '../src/core/review/question'
import type { AnswerRecord } from '../src/core/review/answer-record'
import { OUTBOX_DATABASE, OUTBOX_STORE } from '../src/data/local/outbox'

// What both suites that watch the browser's queue need of it, held once: the rows a real
// IndexedDB kept, and which question the seeded deck asks where. `review.spec.ts` asks whether
// the queue is written, `sync.spec.ts` asks whether it empties, and a second spelling of either
// would let one of them pass against a store the application does not use.

// The deck asks every meaning before any reading, so the first two cards are two subjects asked
// the same question rather than one subject asked twice.
export function asked(position: number): Question {
  const question = DEMO_QUESTIONS[position]
  if (question === undefined) throw new Error('The demo deck asks fewer questions than this.')

  return question
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
