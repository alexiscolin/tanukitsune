import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

import type { AnswerRecord } from '@/core/review/answer-record'
import type { OutboxPort } from '@/core/review/outbox-port'

// The browser's half of the data layer, and the only file here that runs on the device rather
// than on the server. It holds the one piece of local state nothing can rebuild: an answer,
// written before the interface accepts it and kept until a flush has taken it.
//
// Named here and read by the end-to-end suite, which opens the same database the application
// wrote: two spellings of one name would let the suite pass against a store nobody uses.
export const OUTBOX_DATABASE = 'tanukitsune'
export const OUTBOX_STORE = 'outbox'

// The stores the caches will join, so their arrival is an upgrade rather than a second database.
const VERSION = 1

type LocalSchema = DBSchema & {
  outbox: { key: string; value: AnswerRecord }
}

let opened: Promise<IDBPDatabase<LocalSchema>> | null = null

function database(): Promise<IDBPDatabase<LocalSchema>> {
  opened ??= openDB<LocalSchema>(OUTBOX_DATABASE, VERSION, {
    upgrade: (db) => {
      // Keyed on the row's own identifier, which the client generates, so a replayed append
      // collides rather than overwriting the answer already there.
      db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' })
    },
  })

  return opened
}

export function localOutbox(): OutboxPort {
  return {
    // `add` rather than `put`: a duplicate identifier is a replay, and a store that accepted it
    // silently would lose the row it replaced. The rejection reaches the card as a refusal.
    append: async (record) => {
      await (await database()).add(OUTBOX_STORE, record)
    },
    clear: async () => {
      await (await database()).clear(OUTBOX_STORE)
    },
  }
}
