import { isKana } from 'wanakana'
import { describe, expect, it } from 'vitest'

import { DEMO_DECK, DEMO_QUESTIONS } from './demo-deck'

function subjectIds() {
  return new Set(DEMO_QUESTIONS.map((question) => question.subject.id))
}

describe('DEMO_DECK', () => {
  it('covers every shape the source can send, so no branch of the card is unrendered', () => {
    const types = new Set(DEMO_DECK.map((subject) => subject.type))

    expect(types.has('radical')).toBe(true)
    expect(types.has('kanji')).toBe(true)
    expect(types.has('vocabulary')).toBe(true)
    expect(types.has('kanaVocabulary')).toBe(true)
  })

  it('carries a subject with no character at all, which renders as artwork and not as text', () => {
    const imageless = DEMO_DECK.filter((subject) => subject.characters === null)

    expect(imageless).not.toHaveLength(0)
    for (const subject of imageless) expect(subject.characterImage).not.toBeNull()
  })

  it('carries a subject whose glosses are shown without being accepted', () => {
    const listed = DEMO_DECK.flatMap((subject) => [...subject.meanings, ...subject.readings]).filter(
      (gloss) => !gloss.accepted,
    )

    expect(listed).not.toHaveLength(0)
  })

  it('gives every subject a primary meaning, since a card with no headline asks nothing', () => {
    for (const subject of DEMO_DECK) {
      expect(subject.meanings.some((gloss) => gloss.primary && gloss.accepted)).toBe(true)
    }
  })
})

describe('DEMO_QUESTIONS', () => {
  it('asks every subject for its meaning, and for its reading where it has one', () => {
    const asked = DEMO_DECK.filter((subject) => !subject.hidden)

    expect(subjectIds().size).toBe(asked.length)
    expect(DEMO_QUESTIONS.filter((question) => question.kind === 'meaning')).toHaveLength(
      asked.length,
    )
    expect(DEMO_QUESTIONS.filter((question) => question.kind === 'reading')).toHaveLength(
      asked.filter((subject) => subject.readings.some((reading) => reading.accepted)).length,
    )
  })

  it('accepts a reading only as kana, which is the only thing the field can produce', () => {
    for (const question of DEMO_QUESTIONS.filter((candidate) => candidate.kind === 'reading')) {
      for (const reference of question.accepted) expect(isKana(reference)).toBe(true)
    }
  })

  it('carries no blank reference, which would accept an empty answer at tier 1', () => {
    for (const question of DEMO_QUESTIONS) {
      for (const reference of question.accepted) expect(reference.trim()).not.toBe('')
    }
  })

  // The whitelist widens what is accepted without widening what the card claims the answer is,
  // so it belongs to the question and never to the meanings the card lists.
  it('accepts the synonyms the source whitelists, which the card never shows', () => {
    for (const subject of DEMO_DECK.filter((one) => one.alsoAccepted.length > 0)) {
      const question = DEMO_QUESTIONS.find(
        (one) => one.subject.id === subject.id && one.kind === 'meaning',
      )

      for (const synonym of subject.alsoAccepted) expect(question?.accepted).toContain(synonym)
    }
  })

  // Asked back to back, the second question is answered from the first rather than from
  // memory, which is the one thing a deck demonstrating retrieval must not do.
  it('never asks a subject twice in a row', () => {
    const adjacent = DEMO_QUESTIONS.filter(
      (question, at) => at > 0 && DEMO_QUESTIONS[at - 1]?.subject.id === question.subject.id,
    )

    expect(adjacent).toEqual([])
  })

  it('never asks a subject the source has withdrawn', () => {
    for (const question of DEMO_QUESTIONS) expect(question.subject.hidden).toBe(false)
  })
})
