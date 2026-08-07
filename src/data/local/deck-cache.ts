import type { Assignment } from '@/core/knowledge-source'
import type { Flow, Subject } from '@/core/subject'

import { database, DECK_STORE } from './database'

// What a sitting was dealt, written so the same sitting can be dealt again with no network. One
// record per flow, replaced whole: half of the previous sitting beside half of this one is a session
// that deals a card with nothing behind it.
//
// Written here and read nowhere yet: the screen that deals from it rather than from the server is
// its own change, and a reader landing before it would be a function nothing calls.
export async function holdDeck(
  flow: Flow,
  subjects: readonly Subject[],
  waiting: readonly Assignment[],
): Promise<void> {
  await (await database()).put(DECK_STORE, { flow, subjects, waiting })
}
