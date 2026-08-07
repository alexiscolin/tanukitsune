import type { Assignment } from '@/core/knowledge-source'
import type { Subject } from '@/core/subject'

import { ASSIGNMENT_STORE, database, SUBJECT_STORE } from './database'
import type { LocalSchema } from './database'

// What a sitting was dealt, kept so the same sitting can be dealt again with no network. These are
// caches of server truth: replaced wholesale and never merged, so what a browser evicts costs a
// download rather than an answer. The outbox next door is the opposite, and the two must not be
// confused when one of them is being cleared.
//
// Written here and read nowhere yet: the screen that deals from it rather than from the server is
// its own change, and a reader landing before it would be a function nothing calls.

type Cached = keyof Pick<LocalSchema, 'subjects' | 'assignments'>

// Replaced in one transaction, cleared and refilled together: a store holding half of the previous
// deck beside half of this one is a session that deals a card with nothing behind it.
async function replace<Store extends Cached>(
  store: Store,
  rows: readonly LocalSchema[Store]['value'][],
): Promise<void> {
  const writing = (await database()).transaction(store, 'readwrite')

  await writing.store.clear()
  await Promise.all([...rows.map((row) => writing.store.put(row)), writing.done])
}

export async function holdDeck(
  subjects: readonly Subject[],
  waiting: readonly Assignment[],
): Promise<void> {
  await replace(SUBJECT_STORE, subjects)
  await replace(ASSIGNMENT_STORE, waiting)
}
