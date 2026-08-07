import type { Assignment } from '@/core/knowledge-source'
import type { Flow, Subject } from '@/core/subject'

import { database, DECK_STORE } from './database'

// What a sitting was dealt, written so the same sitting can be dealt again with no network. One
// record per flow, replaced whole: half of the previous sitting beside half of this one is a session
// that deals a card with nothing behind it.
export async function holdDeck(
  flow: Flow,
  subjects: readonly Subject[],
  waiting: readonly Assignment[],
): Promise<void> {
  await (await database()).put(DECK_STORE, { flow, subjects, waiting })
}

// What the device holds for a flow, or nothing. Nothing is the ordinary answer on a device that has
// never opened this flow online, and the screen says so rather than dealing an empty session.
export async function heldDeck(
  flow: Flow,
): Promise<{ subjects: readonly Subject[]; waiting: readonly Assignment[] } | null> {
  const held = await (await database()).get(DECK_STORE, flow)

  return held === undefined ? null : { subjects: held.subjects, waiting: held.waiting }
}
