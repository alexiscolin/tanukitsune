import 'server-only'

import { DEMO_DECK, DEMO_SUBJECTS_ASKED } from '@/core/demo-deck'
import type { Assignment } from '@/core/knowledge-source'
import { deckFor, sessionOf } from '@/core/review/deck'
import type { Flow, Subject } from '@/core/subject'
import { env } from '@/data/env'
import { wanikaniSource } from '@/data/wanikani/source'

// Where a deck comes from, and the one place that decides. With a token it is the reader's own
// account, without one it is the seeded deck, which is what makes a single public URL both the demo
// and the product.

// Where the source answers. Absent is theirs, which is every deployment; the end-to-end suite names
// its own.
function sourceFor(token: string) {
  return wanikaniSource(token, env.WANIKANI_API)
}

// What is waiting, counted in subjects rather than in questions, which is the number the source's
// own client shows and the one the reader recognises: a kanji asked for its meaning and its
// reading is one item due, not two. A session takes ten of them, so this is no longer the number
// of cards the next session deals.
export type Due = { readonly lessons: number; readonly reviews: number; readonly demo: boolean }

export async function due(): Promise<Due> {
  const token = env.WANIKANI_TOKEN
  if (token === undefined)
    return { lessons: DEMO_DECK.length, reviews: DEMO_SUBJECTS_ASKED, demo: true }

  // One request per queue and no subject fetched at all: a count needs what is waiting and not
  // what each item is, which is the difference between the screen a session starts from opening
  // at once and it opening after the whole curriculum has been read.
  const queues = await sourceFor(token).listWaiting()

  return { lessons: queues.lessons.length, reviews: queues.reviews.length, demo: false }
}

// The subjects one sitting deals, and only those: the rest of the queue is fetched when the
// reader comes back for it.
async function dealt(
  token: string,
  flow: Flow,
): Promise<{ readonly deck: readonly Subject[]; readonly waiting: readonly Assignment[] }> {
  const source = sourceFor(token)
  const queues = await source.listWaiting()
  const sitting = sessionOf(flow === 'lesson' ? queues.lessons : queues.reviews)
  const subjects = await source.listSubjects(sitting.map((entry) => entry.subjectId))

  const deck = deckFor(sitting, subjects)
  // Only what the deck kept. `deckFor` drops an assignment whose subject the source withdrew or
  // never sent, and a cached record naming one would let a later flush advance an item the reader
  // was never asked.
  const kept = new Set(deck.map((subject) => subject.id))

  return { deck, waiting: sitting.filter((entry) => kept.has(entry.subjectId)) }
}

// What one sitting is, for whoever asks. Which deck a deployment serves is not asked here: it is
// the same answer for every reader of it, so the shell carries it and this route never needs to be
// reached to know it.
export type Sitting = {
  readonly subjects: readonly Subject[]
  readonly waiting: readonly Assignment[]
}

export async function dealtFor(flow: Flow): Promise<Sitting> {
  const token = env.WANIKANI_TOKEN
  if (token === undefined) return { subjects: [], waiting: [] }

  const sitting = await dealt(token, flow)

  return { subjects: sitting.deck, waiting: sitting.waiting }
}

// Which of the two decks this deployment serves. Deployment configuration rather than account data,
// so it travels in the shell: the seeded deck is a constant already in the bundle, and a demo that
// needed a request to know it was the demo would be the one deployment that cannot open offline.
export function servesDemo(): boolean {
  return env.WANIKANI_TOKEN === undefined
}
