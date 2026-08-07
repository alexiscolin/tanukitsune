import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

import type { Assignment } from '@/core/knowledge-source'
import type { AnswerRecord } from '@/core/review/answer-record'
import type { Flow, Subject } from '@/core/subject'

// The browser's database, opened once and shared by every store in it. One database rather than one
// per store, because a version belongs to the whole of it: two files calling `openDB` on this name
// with two versions would each upgrade away the other's stores.
//
// Named here and read by the end-to-end suite, which opens what the application wrote: two spellings
// of one name would let the suite pass against a store nobody uses.
export const OUTBOX_DATABASE = 'tanukitsune'
export const OUTBOX_STORE = 'outbox'

// What one sitting was dealt, kept so it can be dealt again with no network. A cache of server
// truth, replaced wholesale and never merged, per docs/framing.md under local state: what a browser
// evicts costs a download rather than an answer, which is what tells it apart from the outbox, where
// a lost row is an answer that existed nowhere else.
export const DECK_STORE = 'decks'

// One record per flow, because a lesson and a review are two sittings and the reader may hold both.
// Keyed on the flow rather than on the subject: replacing a sitting is one write, and a subject
// belonging to two sittings is held twice rather than shared, which is what keeps the replacement
// wholesale.
export type HeldDeck = {
  readonly flow: Flow
  readonly subjects: readonly Subject[]
  readonly waiting: readonly Assignment[]
}

const VERSION = 2

export type LocalSchema = DBSchema & {
  outbox: { key: string; value: AnswerRecord }
  decks: { key: Flow; value: HeldDeck }
}

// A tab holding the previous version blocks this one, and blocked is not an error: the request stays
// pending for as long as that tab lives. Bounded rather than awaited, so a caller meets a refusal it
// can show instead of a card that has silently stopped taking answers.
const BLOCKED_TIMEOUT = 3_000

let opened: Promise<IDBPDatabase<LocalSchema>> | null = null

function open(): Promise<IDBPDatabase<LocalSchema>> {
  return openDB<LocalSchema>(OUTBOX_DATABASE, VERSION, {
    // Every version from the one the device holds, because a browser that skipped a release arrives
    // here at any of them: a bare `if` on the newest would leave the stores of the one between
    // uncreated. `from` is zero on a device that has never opened this database.
    upgrade: (db, from) => {
      // Keyed on the row's own identifier, which the client generates, so a replayed append
      // collides rather than overwriting the answer already there.
      if (from < 1) db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' })

      if (from < 2) db.createObjectStore(DECK_STORE, { keyPath: 'flow' })
    },
    // This connection is what a newer tab is waiting on. Closed rather than held, so the upgrade it
    // asked for can run: a tab that keeps its connection open blocks every other tab in the profile.
    blocking: () => {
      void opened?.then((db) => {
        db.close()
        opened = null
      })
    },
    terminated: () => {
      opened = null
    },
  })
}

export function database(): Promise<IDBPDatabase<LocalSchema>> {
  // A failure is not memoised, for the reason `db.ts` gives beside the same shape: caching the
  // rejected promise would turn one blocked upgrade into a store that refuses every answer for
  // as long as the page is open.
  opened ??= Promise.race([
    open(),
    new Promise<never>((_, refuse) =>
      setTimeout(
        () => refuse(new Error('The local database is held open by another tab.')),
        BLOCKED_TIMEOUT,
      ),
    ),
  ]).catch((reason: unknown) => {
    opened = null

    throw reason
  })

  return opened
}
