import type { AnswerKind } from '../answer-kind'
import type { AcceptedAnswers } from '../grading/judge-port'
import { acceptedIn } from '../subject'
import type { Subject } from '../subject'

// One question, which is a subject asked for one of the two things it can be asked for.
export type Question = {
  readonly subject: Subject
  readonly kind: AnswerKind
  readonly accepted: AcceptedAnswers
}

// What tells one question from another, and it is the pair rather than the subject: the same
// subject is asked twice in a deck, once for its meaning and once for its reading. Three things
// key on it and two of them are load-bearing, the card the deck is dealing and the field that
// remounts per question, so they are the same string by construction rather than by agreement.
export function questionKey({ subject, kind }: Question): string {
  return `${subject.id}-${kind}`
}

// What a tier may accept, which is not everything the card shows: a gloss can be listed and
// refused in the same breath, and the whitelist is accepted without ever being shown. A
// question with nothing acceptable cannot be asked at all, so it is dropped rather than
// guarded against at the moment of grading.
function ask(subject: Subject, kind: AnswerKind): Question | null {
  const glosses = kind === 'reading' ? subject.readings : subject.meanings
  const shown = acceptedIn(glosses)
  const [first, ...rest] = kind === 'meaning' ? [...shown, ...subject.alsoAccepted] : shown

  return first === undefined ? null : { subject, kind, accepted: [first, ...rest] }
}

// Every meaning, then every reading, so a subject's two questions are never adjacent. Asked
// back to back, the second is answered from the first rather than from memory, which is the
// one thing a deck demonstrating retrieval must not do. Content the source has withdrawn is
// never asked: a subject that must not be rendered must not be queued.
export function questionsFor(deck: readonly Subject[]): readonly Question[] {
  const askable = deck.filter((subject) => !subject.hidden)

  return [
    ...askable.map((subject) => ask(subject, 'meaning')),
    ...askable.map((subject) => ask(subject, 'reading')),
  ].filter((question): question is Question => question !== null)
}
