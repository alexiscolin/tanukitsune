import { describe, expect, it } from 'vitest'

import { mentionedIn, toAssignment, toComponent, toStudyMaterial, toSubject } from './payload'
import type { SubjectEntry } from './payload'

// The wire as they send it, trimmed to the fields the mapping reads. Written here rather than
// captured, because a fixture nobody can read is a fixture nobody can correct.
const KANJI: SubjectEntry = {
  id: 451,
  object: 'kanji',
  data: {
    level: 1,
    hidden_at: null,
    characters: '下',
    meanings: [
      { meaning: 'Below', primary: true, accepted_answer: true },
      { meaning: 'Under', primary: false, accepted_answer: true },
    ],
    auxiliary_meanings: [
      { meaning: 'beneath', type: 'whitelist' },
      { meaning: 'down', type: 'blacklist' },
    ],
    readings: [
      { reading: 'か', primary: true, accepted_answer: true, type: 'onyomi' },
      { reading: 'した', primary: false, accepted_answer: false, type: 'kunyomi' },
    ],
    component_subject_ids: [440],
    amalgamation_subject_ids: [2493],
    context_sentences: [{ en: 'It is under the table.', ja: 'テーブルの下です。' }],
  },
}

const GROUND: SubjectEntry = {
  id: 440,
  object: 'radical',
  data: {
    level: 1,
    hidden_at: null,
    characters: '一',
    meanings: [{ meaning: 'Ground', primary: true, accepted_answer: true }],
  },
}

const mentioned = new Map([[GROUND.id, toComponent(GROUND)]])

describe('toSubject', () => {
  it('reads the answer split off the source rather than off the meaning list', () => {
    const subject = toSubject(KANJI, mentioned)

    expect(subject.meanings.map((meaning) => meaning.text)).toEqual(['Below', 'Under'])
    expect(subject.readings[1]).toMatchObject({ text: 'した', accepted: false, type: 'kunyomi' })
  })

  // The two halves of one field, and they do opposite jobs: one is never accepted whatever a
  // tier decides, the other is accepted and never shown.
  it('splits the auxiliary meanings into what is refused and what is also accepted', () => {
    const subject = toSubject(KANJI, mentioned)

    expect(subject.refused).toEqual(['down'])
    expect(subject.alsoAccepted).toEqual(['beneath'])
  })

  // A number is neither a character nor a meaning, and the card shows both.
  it('names the subjects this one mentions instead of carrying their identifiers', () => {
    const subject = toSubject(KANJI, mentioned)

    expect(subject.components).toEqual([{ id: 440, characters: '一', meaning: 'Ground' }])
    // Mentioned and not fetched: a relation that cannot be named is dropped rather than rendered
    // as an empty line on the card.
    expect(subject.usedIn).toEqual([])
  })

  it('carries the sentence gloss in whatever language the source sent it', () => {
    const subject = toSubject(KANJI, mentioned)

    expect(subject.sentences).toEqual([
      { ja: 'テーブルの下です。', gloss: 'It is under the table.' },
    ])
  })

  // The three groups `Subject` names are filled by three different writers. This one knows the
  // source, so the corpus fields and the reader's own are empty rather than invented.
  it('leaves what the corpus writes and what the reader wrote empty', () => {
    const subject = toSubject(KANJI, mentioned)

    expect(subject.nuance).toBeNull()
    expect(subject.mnemonic).toBeNull()
    expect(subject.synonyms).toEqual([])
    expect(subject.srsStage).toBeNull()
  })

  it('refuses a kind of subject the interface has no card for', () => {
    expect(() => toSubject({ ...GROUND, object: 'lesson_plan' }, mentioned)).toThrow(
      'kind lesson_plan',
    )
  })

  // The one place in the interface where a glyph is not text, and the plain vector is the one
  // the card can turn over on the dark ground.
  it('takes the vector without its own styles for a radical with no character', () => {
    const artwork = toSubject(
      {
        ...GROUND,
        data: {
          ...GROUND.data,
          characters: null,
          character_images: [
            {
              url: 'https://example.test/styled.svg',
              content_type: 'image/svg+xml',
              metadata: { inline_styles: true },
            },
            {
              url: 'https://example.test/plain.svg',
              content_type: 'image/svg+xml',
              metadata: { inline_styles: false },
            },
          ],
        },
      },
      mentioned,
    )

    expect(artwork.characterImage).toBe('https://example.test/plain.svg')
  })
})

describe('mentionedIn', () => {
  it('names every relation the card resolves, in one list', () => {
    expect(mentionedIn(KANJI)).toEqual([440, 2493])
  })
})

describe('toAssignment', () => {
  // Three fields and no more: the subject, what the reader has done with it, and the identifier a
  // submission names, the source advancing an assignment rather than a subject.
  it('names the assignment, its subject and what the reader has done with it', () => {
    const assignment = toAssignment({ id: 80463006, data: { subject_id: 451, srs_stage: 2 } })

    expect(assignment).toEqual({ id: 80463006, subjectId: 451, srsStage: 2 })
  })

  // Zero is a subject unlocked and never studied, which is what makes it a lesson rather than a
  // review, and it is the one stage the two queues are told apart by.
  it('keeps the stage that makes a subject a lesson', () => {
    const assignment = toAssignment({ id: 80463007, data: { subject_id: 440, srs_stage: 0 } })

    expect(assignment.srsStage).toBe(0)
  })
})

describe('toStudyMaterial', () => {
  // The reader's own words about a subject: synonyms are answers beside the source's own, and the
  // two notes are theirs alone. They arrive from a different endpoint and belong on the subject.
  it('reads what the reader wrote about a subject', () => {
    expect(
      toStudyMaterial({
        id: 65231,
        data: {
          subject_id: 451,
          meaning_synonyms: ['en dessous'],
          meaning_note: 'à ne pas confondre avec 上',
          reading_note: null,
        },
      }),
    ).toEqual({
      subjectId: 451,
      synonyms: ['en dessous'],
      meaningNote: 'à ne pas confondre avec 上',
      readingNote: null,
    })
  })
})
