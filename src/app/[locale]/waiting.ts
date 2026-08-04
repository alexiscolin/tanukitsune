import 'server-only'

import { DEMO_DECK, DEMO_QUESTIONS } from '@/core/demo-deck'
import { deckFor } from '@/core/review/deck'
import { questionsFor } from '@/core/review/question'
import type { Question } from '@/core/review/question'
import type { Subject } from '@/core/subject'
import { env } from '@/data/env'
import { wanikaniSource } from '@/data/wanikani/source'

// What the two routes deal, and the one place that decides where it comes from. With a token it
// is the reader's own account, without one it is the seeded deck, which is what makes a single
// public URL both the demo and the product.
//
// Both screens read the same two decks, so the number the start screen shows is the number of
// cards the session then deals rather than a second count that can disagree with it.
export type Waiting = {
  readonly lessons: readonly Subject[]
  readonly reviews: readonly Question[]
  // Which of the two this is, because the start screen says so and a screen dealing a real
  // account while promising that nothing leaves the device is worse than one saying nothing.
  readonly demo: boolean
}

const DEMO: Waiting = { lessons: DEMO_DECK, reviews: DEMO_QUESTIONS, demo: true }

export async function waiting(): Promise<Waiting> {
  const token = env.WANIKANI_TOKEN
  if (token === undefined) return DEMO

  const source = wanikaniSource(token)
  const queues = await source.listWaiting()
  // One request for both queues rather than one each: they are asked of the same endpoint by
  // identifier, and a subject waiting in both is fetched once.
  const subjects = await source.listSubjects([
    ...new Set([...queues.lessons, ...queues.reviews].map((entry) => entry.subjectId)),
  ])

  return {
    lessons: deckFor(queues.lessons, subjects),
    reviews: questionsFor(deckFor(queues.reviews, subjects)),
    demo: false,
  }
}
