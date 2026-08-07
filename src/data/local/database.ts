import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

import type { AnswerRecord } from '@/core/review/answer-record'

// The browser's database, opened once and shared by every store in it. One database rather than one
// per store, because a version belongs to the whole of it: two files calling `openDB` on this name
// with two versions would each upgrade away the other's stores.
//
// Named here and read by the end-to-end suite, which opens what the application wrote: two spellings
// of one name would let the suite pass against a store nobody uses.
export const OUTBOX_DATABASE = 'tanukitsune'
export const OUTBOX_STORE = 'outbox'

const VERSION = 1

export type LocalSchema = DBSchema & {
  outbox: { key: string; value: AnswerRecord }
}

let opened: Promise<IDBPDatabase<LocalSchema>> | null = null

export function database(): Promise<IDBPDatabase<LocalSchema>> {
  // A failure is not memoised, for the reason `db.ts` gives beside the same shape: caching the
  // rejected promise would turn one blocked upgrade into a store that refuses every answer for
  // as long as the page is open.
  opened ??= openDB<LocalSchema>(OUTBOX_DATABASE, VERSION, {
    upgrade: (db) => {
      // Keyed on the row's own identifier, which the client generates, so a replayed append
      // collides rather than overwriting the answer already there.
      db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' })
    },
  }).catch((reason: unknown) => {
    opened = null

    throw reason
  })

  return opened
}
