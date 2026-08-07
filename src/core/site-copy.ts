import type { AnswerKind } from './answer-kind'
import type { Verdict } from './grading/judge-port'
import type { Band, Flow, ReadingType, SubjectType } from './subject'
import { DEFAULT_LOCALE, isLocale } from './locales'
import type { Locale } from './locales'

// The review screen's own strings, grouped rather than spread through `SiteCopy`, which
// names the page furniture. The session takes this and nothing else, so a client component
// never resolves a locale.
export type ReviewCopy = {
  // Keyed by the kind rather than two fields, so a kind added to the union without its
  // question is a type error rather than a blank label.
  readonly prompt: Record<AnswerKind, string>
  readonly unconverted: string
  // When the answer could not be written to the local queue. The card stays and the gesture is
  // the retry, so the line says what happened and what to do rather than only that it failed.
  readonly unwritten: string
  // Keyed by the verdict for the reason the question is keyed by the kind: a verdict added
  // without its word is a type error rather than a blank line where the answer was judged.
  readonly verdict: Record<Verdict, string>
  // When the account cannot be reached and the device holds nothing for this flow. There is no
  // gesture that fixes it from here, so the line says what is missing rather than offering a retry.
  readonly unreachable: string
  readonly askSelfGrade: string
  // One label per verdict, because each asks the same question: say what the answer was.
  readonly grade: Record<Verdict, string>
  readonly next: string
  readonly done: string
  // The way out of the end, which every flow owes: a session that ends on a screen with no
  // exit is one the reader leaves by reloading.
  readonly back: string
  // The three numbers a session has, at the foot of the card.
  readonly tally: { readonly done: string; readonly left: string; readonly missed: string }
}

// The screen a session is started from. Keyed by the flow for the reason the question is
// keyed by the kind: a flow added to the union without its word is a type error rather than a
// row nobody named.
export type StartCopy = {
  readonly flow: Record<Flow, string>
  // What demo mode is, said on the one screen a reader arrives on. The queue is written to
  // the device and nothing is sent anywhere, and that is a promise rather than a limitation.
  readonly demo: string
}

// Everything a subject card names about what it is showing. Apart from the review loop
// because a card is shown outside one too, in a lesson, where nothing is being asked.
export type SubjectCopy = {
  // One label per type and per reading kind, so a taxonomy that grows without its words is a
  // type error rather than a heading nobody wrote.
  readonly type: Record<SubjectType, string>
  readonly reading: Record<ReadingType, string>
  readonly plainReading: string
  readonly level: string
  readonly meaning: string
  readonly nuance: string
  readonly mnemonic: string
  readonly components: string
  readonly usedIn: string
  readonly similar: string
  readonly synonyms: string
  readonly yourNote: string
  readonly patterns: string
  readonly sentences: string
  readonly wordType: string
  readonly alsoShown: string
  readonly never: string
  // One word per rung of the mastery ramp, for the same reason the types are keyed.
  readonly stage: Record<Band, string>
  readonly reveal: string
  readonly listen: string
}

export type SiteCopy = {
  readonly title: string
  readonly tagline: string
  readonly notFound: string
  readonly error: string
  readonly retry: string
  readonly start: StartCopy
  readonly review: ReviewCopy
  readonly subject: SubjectCopy
}

// A Record over Locale rather than a lookup that can miss: adding a locale
// without its copy is a type error rather than a page in the wrong language.
const SITE_COPY: Record<Locale, SiteCopy> = {
  fr: {
    title: 'Tanukitsune',
    tagline: 'Généré dans ta langue, noté sur ce que tu voulais dire, au rythme de ta mémoire.',
    notFound: "Cette page n'existe pas.",
    error: 'Quelque chose a cassé de notre côté.',
    retry: 'Réessayer',
    start: {
      flow: { lesson: 'Leçons', review: 'Révisions' },
      demo: 'Mode démo. Tout reste sur cet appareil.',
    },
    review: {
      prompt: { meaning: 'Sens', reading: 'Lecture' },
      unconverted: "Cette réponse n'est pas une lecture en kana.",
      unwritten: 'Réponse non enregistrée. Refais le geste.',
      verdict: { correct: 'Juste', incorrect: 'Faux' },
      unreachable: 'Hors ligne, et rien de cette série sur cet appareil.',
      askSelfGrade: "Rien n'a pu trancher. C'était juste ?",
      grade: { correct: "C'était juste", incorrect: "C'était faux" },
      next: 'Suivant',
      done: 'Session terminée',
      back: 'Revenir au départ',
      tally: { done: 'passées', left: 'restantes', missed: 'erreurs' },
    },
    subject: {
      type: {
        radical: 'radical',
        kanji: 'kanji',
        vocabulary: 'vocabulaire',
        kanaVocabulary: 'vocabulaire en kana',
        grammar: 'grammaire',
        conjugation: 'conjugaison',
      },
      reading: {
        onyomi: "lecture on'yomi",
        kunyomi: "lecture kun'yomi",
        nanori: 'lecture dans les noms',
      },
      plainReading: 'lecture',
      level: 'niveau',
      meaning: 'sens',
      nuance: 'à savoir',
      mnemonic: 'moyen de retenir',
      components: 'composé de',
      usedIn: 'on le retrouve dans',
      similar: 'à ne pas confondre',
      synonyms: 'tes synonymes',
      yourNote: 'ta note',
      patterns: 'comment il se construit',
      sentences: 'en contexte',
      wordType: 'nature',
      alsoShown: 'affiché, jamais accepté en réponse',
      never: 'jamais accepté',
      stage: {
        lesson: 'jamais étudié',
        apprentice: 'apprenti',
        guru: 'confirmé',
        master: 'maître',
        enlightened: 'éclairé',
        burned: 'gravé',
      },
      reveal: 'Révéler la carte',
      listen: 'Écouter la prononciation',
    },
  },
}

// The fallback policy lives here rather than at each call site, so a boundary
// that cannot know the locale and a page that can both resolve it the same way.
export function copyFor(locale: string): SiteCopy {
  return SITE_COPY[isLocale(locale) ? locale : DEFAULT_LOCALE]
}
