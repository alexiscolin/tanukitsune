import type { Assignment } from '../knowledge-source'
import type { Component, Subject } from '../subject'

// How much of a queue one sitting takes. The source hands back everything that is due, which is
// the shape of their API rather than the shape of a day: a queue of hundreds is not a session, it
// is a screen nobody finishes. Ten is the length until the reader chooses it themselves, which
// docs/backlog.md holds for v0.1.1.
export const SESSION_LENGTH = 10

// The front of the queue as the source lists it, which is not the same as the most urgent: their
// collections are paged by identifier and an assignment carries no order of its own here. Dealing
// by how long an item has been due needs `available_at`, which docs/backlog.md holds.
export function sessionOf(waiting: readonly Assignment[]): readonly Assignment[] {
  return waiting.slice(0, SESSION_LENGTH)
}

// What a session is dealt, which neither half of the source's answer holds on its own: the queue
// says what is waiting and in what order, the subjects say what each one is, and the stage is
// what this reader has done with it. The join is here rather than in the route because it is a
// rule and not plumbing, and because a screen dealing a card with nothing behind it is the one
// failure this drops instead of rendering.
export function deckFor(
  waiting: readonly Assignment[],
  subjects: readonly Subject[],
): readonly Subject[] {
  const known = new Map(subjects.map((subject) => [subject.id, subject]))

  return waiting.flatMap((assignment) => {
    const subject = known.get(assignment.subjectId)
    // Content the source has withdrawn is filtered out of a queue rather than handled by a card.
    // `questionsFor` holds the same line for a deck that never passed through here, which the
    // seeded one does not.
    if (subject === undefined || subject.hidden) return []

    return [{ ...subject, srsStage: assignment.srsStage }]
  })
}

// What one card was written in a locale, which the source knows nothing of: it deals the upstream
// curriculum in its own language. `nuance` and `mnemonic` are absent for a card whose meaning is
// written and whose story is not yet, which is most of the curriculum.
export type Written = {
  readonly meaning: string
  readonly nuance: string | null
  readonly mnemonic: string | null
  readonly readingMnemonic: string | null
}

// The same deck, each subject carrying what the locale wrote for it. Here beside `deckFor` for the
// same reason: assembling a dealt sitting from its parts is a rule rather than plumbing. A subject
// the locale has nothing for keeps the empty fields it arrived with, since the question is asked
// either way.
export function withText(
  subjects: readonly Subject[],
  written: ReadonlyMap<number, Written>,
): readonly Subject[] {
  // A part is a subject of its own, so what the locale wrote for it is what names it here. Left alone,
  // the strip under the card names the same pieces the story just named, in the source's language: the
  // reader reads la bouche in the story and a foreign word for it one line below.
  const named = (parts: readonly Component[]): readonly Component[] =>
    parts.map((part) => {
      const said = written.get(part.id)

      return said === undefined ? part : { ...part, meaning: said.meaning }
    })

  return subjects.map((subject) => {
    const text = written.get(subject.id)
    const parts = {
      components: named(subject.components),
      usedIn: named(subject.usedIn),
      similar: named(subject.similar),
    }

    if (text === undefined) return { ...subject, ...parts }

    return {
      ...subject,
      ...parts,
      // The one word the card shows and the one it accepts. What the source calls the meaning is its
      // own language, and a course asking for it in that language is not the course: the locale's word
      // takes the place of all three lists the source sends, the words it accepts without showing them
      // and the words it shows struck through included, since those are the same language again. The
      // reader's own synonyms are theirs and stay.
      meanings: [{ text: text.meaning, primary: true, accepted: true }],
      alsoAccepted: [],
      refused: [],
      nuance: text.nuance,
      mnemonic: text.mnemonic,
      readingMnemonic: text.readingMnemonic,
    }
  })
}
