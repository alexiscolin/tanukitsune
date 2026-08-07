import { z } from 'zod'

import type { Advanced, Assignment } from '@/core/knowledge-source'
import type { Component, Reading, Sentence, Subject, SubjectType } from '@/core/subject'

// The wire, parsed at the boundary and never carried past it. A component reading snake_case off
// an HTTP response is a boundary that was never drawn, so everything here ends as `Subject` or
// `Assignment` and the shapes below are private to this file.
//
// Parsed rather than trusted, for the same reason the environment is: a field the source renames
// fails here, once, with the field named, instead of arriving as undefined in a card.

const SUBJECT_TYPES: Record<string, SubjectType> = {
  radical: 'radical',
  kanji: 'kanji',
  vocabulary: 'vocabulary',
  kana_vocabulary: 'kanaVocabulary',
}

const gloss = z.object({
  meaning: z.string(),
  primary: z.boolean(),
  accepted_answer: z.boolean(),
})

const reading = z.object({
  reading: z.string(),
  primary: z.boolean(),
  accepted_answer: z.boolean(),
  // Absent on a vocabulary, whose reading is not borrowed or native, it is simply how the word
  // is said. Present on every kanji, where the distinction is what the card's script says.
  type: z.enum(['onyomi', 'kunyomi', 'nanori']).optional(),
})

const subjectEntry = z.object({
  id: z.number(),
  object: z.string(),
  data: z.object({
    level: z.number(),
    hidden_at: z.string().nullable(),
    characters: z.string().nullable(),
    character_images: z
      .array(
        z.object({
          url: z.string(),
          content_type: z.string(),
          metadata: z.object({ inline_styles: z.boolean().optional() }),
        }),
      )
      .optional(),
    meanings: z.array(gloss),
    auxiliary_meanings: z.array(z.object({ meaning: z.string(), type: z.string() })).optional(),
    readings: z.array(reading).optional(),
    component_subject_ids: z.array(z.number()).optional(),
    amalgamation_subject_ids: z.array(z.number()).optional(),
    visually_similar_subject_ids: z.array(z.number()).optional(),
    parts_of_speech: z.array(z.string()).optional(),
    context_sentences: z.array(z.object({ en: z.string(), ja: z.string() })).optional(),
    pronunciation_audios: z.array(z.object({ url: z.string() })).optional(),
  }),
})

const assignmentEntry = z.object({
  id: z.number(),
  data: z.object({
    subject_id: z.number(),
    srs_stage: z.number(),
  }),
})

const studyMaterialEntry = z.object({
  id: z.number(),
  data: z.object({
    subject_id: z.number(),
    meaning_synonyms: z.array(z.string()),
    meaning_note: z.string().nullable(),
    reading_note: z.string().nullable(),
  }),
})

export type StudyMaterial = {
  readonly subjectId: number
  readonly synonyms: readonly string[]
  readonly meaningNote: string | null
  readonly readingNote: string | null
}

export function toStudyMaterial(entry: z.infer<typeof studyMaterialEntry>): StudyMaterial {
  return {
    subjectId: entry.data.subject_id,
    synonyms: entry.data.meaning_synonyms,
    meaningNote: entry.data.meaning_note,
    readingNote: entry.data.reading_note,
  }
}

// The ceiling and whether it still stands. Both, because a lapsed subscription keeps the number
// it reached and grants none of it.
export const userPayload = z.object({
  data: z.object({
    subscription: z.object({ max_level_granted: z.number(), active: z.boolean() }),
  }),
})

export type SubjectEntry = z.infer<typeof subjectEntry>

// Every collection answers in the same envelope, and the cursor is a URL rather than a page
// number: the source hands back where to go next, and following it is the only paging there is.
function collectionOf<Entry extends z.ZodType>(entry: Entry) {
  return z.object({
    pages: z.object({ next_url: z.string().nullable() }),
    data: z.array(entry),
  })
}

export const subjectCollection = collectionOf(subjectEntry)
export const assignmentCollection = collectionOf(assignmentEntry)
export const studyMaterialCollection = collectionOf(studyMaterialEntry)

// What a card shows about a subject it merely mentions: a character and what it means. They
// arrive as identifiers, so the subjects they name are fetched and folded in before anything
// reaches a component, which is what `Component` exists to say.
export function mentionedIn(entry: SubjectEntry): readonly number[] {
  return [
    ...(entry.data.component_subject_ids ?? []),
    ...(entry.data.amalgamation_subject_ids ?? []),
    ...(entry.data.visually_similar_subject_ids ?? []),
  ]
}

export function toComponent(entry: SubjectEntry): Component {
  return {
    id: entry.id,
    characters: entry.data.characters ?? '',
    meaning: entry.data.meanings.find((meaning) => meaning.primary)?.meaning ?? '',
  }
}

function glossesOf(entries: readonly z.infer<typeof gloss>[]) {
  return entries.map((entry) => ({
    text: entry.meaning,
    primary: entry.primary,
    accepted: entry.accepted_answer,
  }))
}

function readingsOf(entries: readonly z.infer<typeof reading>[]): readonly Reading[] {
  return entries.map((entry) => ({
    text: entry.reading,
    primary: entry.primary,
    accepted: entry.accepted_answer,
    type: entry.type ?? null,
  }))
}

function sentencesOf(entries: readonly { en: string; ja: string }[]): readonly Sentence[] {
  return entries.map((entry) => ({ ja: entry.ja, gloss: entry.en }))
}

// The plain black vector rather than the one carrying its own styles: the card turns it over on
// the dark ground, which a fill declared inside the file defeats.
function artworkIn(entry: SubjectEntry): string | null {
  const images = entry.data.character_images ?? []
  const plain = images.find(
    (image) => image.content_type === 'image/svg+xml' && image.metadata.inline_styles !== true,
  )

  return plain?.url ?? null
}

function auxiliary(entry: SubjectEntry, kind: string): readonly string[] {
  return (entry.data.auxiliary_meanings ?? [])
    .filter((meaning) => meaning.type === kind)
    .map((meaning) => meaning.meaning)
}

// The three groups `Subject` names, filled from the two that are upstream: what the source sends
// and what the reader wrote about it, which arrives from another endpoint and is joined here
// rather than patched over the result. What our corpus writes in the reader's language is absent
// by definition, since no corpus exists to write it.
export function toSubject(
  entry: SubjectEntry,
  mentioned: ReadonlyMap<number, Component>,
  own?: StudyMaterial,
): Subject {
  const type = SUBJECT_TYPES[entry.object]
  if (type === undefined) throw new Error(`The source sent a subject of kind ${entry.object}.`)

  const named = (ids: readonly number[] | undefined): readonly Component[] =>
    (ids ?? []).flatMap((id) => {
      const component = mentioned.get(id)

      return component === undefined ? [] : [component]
    })

  return {
    id: entry.id,
    type,
    level: entry.data.level,
    characters: entry.data.characters,
    characterImage: artworkIn(entry),
    meanings: glossesOf(entry.data.meanings),
    readings: readingsOf(entry.data.readings ?? []),
    partsOfSpeech: entry.data.parts_of_speech ?? [],
    sentences: sentencesOf(entry.data.context_sentences ?? []),
    components: named(entry.data.component_subject_ids),
    usedIn: named(entry.data.amalgamation_subject_ids),
    similar: named(entry.data.visually_similar_subject_ids),
    hasAudio: (entry.data.pronunciation_audios ?? []).length > 0,
    refused: auxiliary(entry, 'blacklist'),
    alsoAccepted: auxiliary(entry, 'whitelist'),
    jlpt: null,
    nuance: null,
    mnemonic: null,
    patterns: [],
    hidden: entry.data.hidden_at !== null,
    // From the assignment rather than the subject, and joined by whoever holds both.
    srsStage: null,
    synonyms: own?.synonyms ?? [],
    meaningNote: own?.meaningNote ?? null,
    readingNote: own?.readingNote ?? null,
  }
}

export function toAssignment(entry: z.infer<typeof assignmentEntry>): Assignment {
  return { id: entry.id, subjectId: entry.data.subject_id, srsStage: entry.data.srs_stage }
}

// What one submission produced. Their created review carries an identifier that is always zero, so
// nothing here reads it: the stage the assignment landed on is the whole of what comes back, and it
// sits under the resources they updated rather than in the review itself.
export const reviewPayload = z.object({
  resources_updated: z.object({ assignment: z.object({ data: z.object({ srs_stage: z.number() }) }) }),
})

export function toAdvanced(payload: z.infer<typeof reviewPayload>): Advanced {
  return { srsStage: payload.resources_updated.assignment.data.srs_stage }
}
