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

// Exported because the end-to-end suite opens this database too. A versionless open creates it at
// version one with no stores, and the ladder below would then skip the outbox for ever.
export const VERSION = 2

export type LocalSchema = DBSchema & {
  outbox: { key: string; value: AnswerRecord }
  decks: { key: Flow; value: HeldDeck }
}

// A tab holding an outdated connection blocks this one, and blocked is not an error: the request
// stays pending for as long as that tab lives. Bounded rather than awaited, so a caller meets a
// refusal it can show instead of a card that has silently stopped taking answers.
const BLOCKED_TIMEOUT = 3_000

let opened: Promise<IDBPDatabase<LocalSchema>> | null = null

export function database(): Promise<IDBPDatabase<LocalSchema>> {
  if (opened !== null) return opened

  // This attempt's own connection, not whatever the module holds. An attempt abandoned on the
  // timeout still resolves later, and closing the memoised one instead would take down the
  // connection in use while the abandoned one went on holding the next upgrade.
  let self: IDBPDatabase<LocalSchema> | null = null
  let waited: ReturnType<typeof setTimeout>

  // Only where this attempt is still the one being held: a later, successful attempt must not have
  // its memo cleared by an earlier one giving up.
  const drop = (): void => {
    if (opened === held) opened = null
  }

  const opening = openDB<LocalSchema>(OUTBOX_DATABASE, VERSION, {
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
      self?.close()
      drop()
    },
    terminated: drop,
  })

  void opening.then(
    (db) => {
      self = db
      // Arrived after the wait below gave up, so nothing will ever use it and nothing else would
      // close it. Left open it holds the next upgrade, which is the tab this timeout exists for.
      if (opened !== held) db.close()
    },
    // Answered through `held` below, which is what a caller awaits.
    () => undefined,
  )

  const refusal = new Promise<never>((_, refuse) => {
    waited = setTimeout(
      () => refuse(new Error('The local database is held open by another tab.')),
      BLOCKED_TIMEOUT,
    )
  })

  // A failure is not memoised, for the reason `db.ts` gives beside the same shape: caching the
  // rejected promise would turn one blocked upgrade into a store that refuses every answer for as
  // long as the page is open. The timer is cleared either way, so a page that opened cleanly is not
  // still holding one three seconds later.
  const held: Promise<IDBPDatabase<LocalSchema>> = Promise.race([opening, refusal])
    .finally(() => clearTimeout(waited))
    .catch((reason: unknown) => {
      drop()

      throw reason
    })

  opened = held

  return held
}
