import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

import type { Assignment } from '@/core/knowledge-source'
import type { AnswerRecord } from '@/core/review/answer-record'
import type { Subject } from '@/core/subject'

// The browser's database, opened once and shared by every store in it. One database rather than one
// per store, because a version belongs to the whole of it: two files calling `openDB` on this name
// with two versions would each upgrade away the other's stores.
//
// Named here and read by the end-to-end suite, which opens what the application wrote: two spellings
// of one name would let the suite pass against a store nobody uses.
export const OUTBOX_DATABASE = 'tanukitsune'
export const OUTBOX_STORE = 'outbox'

// Caches of server truth beside the queue, so a sitting the reader has already opened can be dealt
// again with no network. They are replaced wholesale and never merged, per docs/framing.md under
// local state: eviction costs a download rather than data, which is what tells them apart from the
// outbox, where a lost row is an answer that never existed anywhere else.
export const SUBJECT_STORE = 'subjects'
export const ASSIGNMENT_STORE = 'assignments'

// Two, because the caches arrived after the queue. A version belongs to the whole database, which is
// why every store here is opened from this file rather than each opening its own.
const VERSION = 2

export type LocalSchema = DBSchema & {
  outbox: { key: string; value: AnswerRecord }
  subjects: { key: number; value: Subject }
  assignments: { key: number; value: Assignment }
}

let opened: Promise<IDBPDatabase<LocalSchema>> | null = null

export function database(): Promise<IDBPDatabase<LocalSchema>> {
  // A failure is not memoised, for the reason `db.ts` gives beside the same shape: caching the
  // rejected promise would turn one blocked upgrade into a store that refuses every answer for
  // as long as the page is open.
  opened ??= openDB<LocalSchema>(OUTBOX_DATABASE, VERSION, {
    // Every version from the one the device holds, because a browser that skipped a release arrives
    // here at any of them: a bare `if` on the newest would leave the stores of the one between
    // uncreated. `from` is zero on a device that has never opened this database.
    upgrade: (db, from) => {
      // Keyed on the row's own identifier, which the client generates, so a replayed append
      // collides rather than overwriting the answer already there.
      if (from < 1) db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' })

      if (from < 2) {
        // Keyed on the subject the source names, which is what a queue holds and what a card is
        // asked for, so a deck is rebuilt by identifier rather than by walking either store.
        db.createObjectStore(SUBJECT_STORE, { keyPath: 'id' })
        db.createObjectStore(ASSIGNMENT_STORE, { keyPath: 'subjectId' })
      }
    },
  }).catch((reason: unknown) => {
    opened = null

    throw reason
  })

  return opened
}
