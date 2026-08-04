import 'server-only'

import { DEMO_DECK, DEMO_QUESTIONS } from '@/core/demo-deck'
import { deckFor } from '@/core/review/deck'
import { questionsFor } from '@/core/review/question'
import type { Question } from '@/core/review/question'
import type { Flow, Subject } from '@/core/subject'
import { env } from '@/data/env'
import { wanikaniSource } from '@/data/wanikani/source'

// What the two routes deal, and the one place that decides where it comes from. With a token it
// is the reader's own account, without one it is the seeded deck, which is what makes a single
// public URL both the demo and the product.
//
// Named for what it holds rather than for what is waiting, since `KnowledgeSource` already calls
// two lists of assignments a `Waiting` and these are the decks built from them.
type Decks = {
  readonly lessons: readonly Subject[]
  readonly reviews: readonly Question[]
  // Which of the two this is, because the start screen says so, a real account's answers are not
  // cleared when a deck restarts, and a screen dealing one while promising that nothing leaves
  // the device is worse than one saying nothing.
  readonly demo: boolean
}

const DEMO: Decks = { lessons: DEMO_DECK, reviews: DEMO_QUESTIONS, demo: true }

// Which queues to deal. The start screen asks for both, because the two numbers it shows have to
// be what the session then deals, and only a built deck can say how many questions a subject is
// worth. A session asks for the one it runs: the other's subjects would be fetched whole, from
// the same sixty requests a minute, to build a deck nobody opens.
export async function waiting(flows: readonly Flow[]): Promise<Decks> {
  const token = env.WANIKANI_TOKEN
  if (token === undefined) return DEMO

  const source = wanikaniSource(token)
  const queues = await source.listWaiting()
  const asked = flows.flatMap((flow) => (flow === 'lesson' ? queues.lessons : queues.reviews))
  // One request for the queues asked for rather than one each: they are asked of the same
  // endpoint by identifier, and a subject waiting in both is fetched once.
  const subjects = await source.listSubjects([...new Set(asked.map((entry) => entry.subjectId))])

  return {
    lessons: flows.includes('lesson') ? deckFor(queues.lessons, subjects) : [],
    reviews: flows.includes('review') ? questionsFor(deckFor(queues.reviews, subjects)) : [],
    demo: false,
  }
}
