import { describe, expect, it } from 'vitest'

import { KANJI, VERB } from '../demo-deck'
import type { Assignment } from '../knowledge-source'
import { deckFor, SESSION_LENGTH, sessionOf } from './deck'

function waiting(subjectId: number, srsStage: number): Assignment {
  return { subjectId, srsStage }
}

describe('deckFor', () => {
  // The stage is what this reader has done with the subject and not what the subject is, so it
  // arrives from the assignment. The row an answer becomes records it before the answer, which
  // is a fact that exists nowhere else once the answer has moved it.
  it('carries the stage the assignment holds onto the subject it names', () => {
    const deck = deckFor([waiting(KANJI.id, 4)], [KANJI])

    expect(deck[0]?.srsStage).toBe(4)
  })

  // What is waiting is the queue, and the subjects are what was fetched for it: the source is
  // asked for both separately and the second answer can be shorter than the first.
  it('deals what is waiting in the order it is waiting in', () => {
    const deck = deckFor([waiting(VERB.id, 1), waiting(KANJI.id, 2)], [KANJI, VERB])

    expect(deck.map((subject) => subject.id)).toEqual([VERB.id, KANJI.id])
  })

  // A subject above what the subscription grants is never fetched, so its assignment names
  // nothing. Dealing it would put a card on screen with no content behind it.
  it('drops what is waiting on a subject that was not fetched', () => {
    const deck = deckFor([waiting(KANJI.id, 4), waiting(9999, 1)], [KANJI])

    expect(deck.map((subject) => subject.id)).toEqual([KANJI.id])
  })

  // Content the source has withdrawn is never rendered and never asked, which is a rule about
  // the queue and not about the card: both flows deal from here, and one that kept it would
  // teach a subject its own source has taken back.
  it('drops what the source has withdrawn', () => {
    const deck = deckFor([waiting(KANJI.id, 0)], [{ ...KANJI, hidden: true }])

    expect(deck).toEqual([])
  })
})

describe('sessionOf', () => {
  // The source hands back everything that is due, which is the shape of their API and not of a
  // day. A queue of hundreds is a screen nobody finishes.
  it('takes one sitting from a queue longer than one', () => {
    const queue = Array.from({ length: SESSION_LENGTH * 3 }, (_, index) => waiting(index + 1, 1))

    expect(sessionOf(queue)).toHaveLength(SESSION_LENGTH)
  })

  it('takes the front of the queue, since that is what is most due', () => {
    const queue = [waiting(11, 1), waiting(22, 2)]

    expect(sessionOf(queue).map((entry) => entry.subjectId)).toEqual([11, 22])
  })
})
