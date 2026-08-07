import type { OutboxPort } from '@/core/review/outbox-port'

import { database, OUTBOX_STORE } from './database'

// The one piece of local state nothing can rebuild: an answer, written before the interface accepts
// it and kept until a flush has taken it. The database it sits in is opened in database.ts, which
// every store here shares.

// One store per device, so one value rather than a factory returning a new object over the same
// database on every call.
export const localOutbox: OutboxPort = {
  // `add` rather than `put`: a duplicate identifier is a replay, and a store that accepted it
  // silently would lose the row it replaced. The rejection reaches the card as a refusal.
  append: async (record) => {
    await (await database()).add(OUTBOX_STORE, record)
  },
  list: async () => (await database()).getAll(OUTBOX_STORE),
  // One transaction for the whole batch. Removing some rows and leaving others would leave the
  // queue believing part of a batch never arrived, and send those rows a second time.
  remove: async (ids) => {
    const removing = (await database()).transaction(OUTBOX_STORE, 'readwrite')

    await Promise.all([...ids.map((id) => removing.store.delete(id)), removing.done])
  },
  clear: async () => {
    await (await database()).clear(OUTBOX_STORE)
  },
}
