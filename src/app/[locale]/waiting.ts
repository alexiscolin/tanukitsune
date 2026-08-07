import 'server-only'

import { DEMO_DECK, DEMO_QUESTIONS, DEMO_SUBJECTS_ASKED } from '@/core/demo-deck'
import { deckFor, sessionOf } from '@/core/review/deck'
import { questionsFor } from '@/core/review/question'
import type { Question } from '@/core/review/question'
import type { Assignment } from '@/core/knowledge-source'
import type { Flow, Subject } from '@/core/subject'
import type { HeldDeck } from '@/data/local/database'
import { env } from '@/data/env'
import { wanikaniSource } from '@/data/wanikani/source'

// What the two routes deal, and the one place that decides where it comes from. With a token it
// is the reader's own account, without one it is the seeded deck, which is what makes a single
// public URL both the demo and the product.

// Where the source answers, read here because this is the one place that decides where a deck
// comes from. Absent is theirs, which is every deployment; the end-to-end suite names its own.
function sourceFor(token: string) {
  return wanikaniSource(token, env.WANIKANI_API)
}

// Which of the two decks this is. The start screen says so, a real account's answers are not
// cleared when a deck restarts, and a screen dealing one while promising that nothing leaves the
// device is worse than one saying nothing.
//
// A real deck also carries what it was built from, which the cards no longer hold once they are
// questions: the device keeps those so the same sitting can be dealt again with no network. Null on
// the seeded deck, which is a constant already on the device and must not replace what an account
// left in the cache.
type Dealt<Cards> = {
  readonly cards: Cards
  readonly demo: boolean
  readonly held: Omit<HeldDeck, 'flow'> | null
}

// What is waiting, counted in subjects rather than in questions, which is the number the source's
// own client shows and the one the reader recognises: a kanji asked for its meaning and its
// reading is one item due, not two. A session takes ten of them, so this is no longer the number
// of cards the next session deals.
type Due = { readonly lessons: number; readonly reviews: number; readonly demo: boolean }

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

  return { deck: deckFor(sitting, subjects), waiting: sitting }
}

export async function lessonDeck(): Promise<Dealt<readonly Subject[]>> {
  const token = env.WANIKANI_TOKEN
  if (token === undefined) return { cards: DEMO_DECK, demo: true, held: null }

  const sitting = await dealt(token, 'lesson')

  return {
    cards: sitting.deck,
    demo: false,
    held: { subjects: sitting.deck, waiting: sitting.waiting },
  }
}

export async function reviewDeck(): Promise<Dealt<readonly Question[]>> {
  const token = env.WANIKANI_TOKEN
  if (token === undefined) return { cards: DEMO_QUESTIONS, demo: true, held: null }

  const sitting = await dealt(token, 'review')

  return {
    cards: questionsFor(sitting.deck),
    demo: false,
    held: { subjects: sitting.deck, waiting: sitting.waiting },
  }
}
