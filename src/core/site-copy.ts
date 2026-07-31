import type { AnswerKind } from './answer-kind'
import type { Verdict } from './grading/judge-port'
import { DEFAULT_LOCALE, isLocale } from './locales'
import type { Locale } from './locales'

// The review screen's own strings, grouped rather than spread through `SiteCopy`, which
// names the page furniture. The session takes this and nothing else, so a client component
// never resolves a locale.
export type ReviewCopy = {
  readonly progress: string
  // Keyed by the kind rather than two fields, so a kind added to the union without its
  // question is a type error rather than a blank label.
  readonly prompt: Record<AnswerKind, string>
  readonly answerLabel: string
  readonly unconverted: string
  // Keyed by the verdict for the reason the question is keyed by the kind: a verdict added
  // without its word is a type error rather than a blank line where the answer was judged.
  readonly verdict: Record<Verdict, string>
  readonly expected: string
  readonly askSelfGrade: string
  // One label per verdict for the three states, because each asks the same question: say
  // what the answer was. Undecided offers both, a decided verdict offers the other one.
  readonly grade: Record<Verdict, string>
  readonly next: string
  readonly done: string
}

export type SiteCopy = {
  readonly title: string
  readonly tagline: string
  readonly notFound: string
  readonly error: string
  readonly retry: string
  readonly review: ReviewCopy
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
    review: {
      progress: 'Question',
      prompt: { meaning: 'Sens', reading: 'Lecture' },
      answerLabel: 'Réponse',
      unconverted: "Cette réponse n'est pas une lecture en kana.",
      verdict: { correct: 'Juste', incorrect: 'Faux' },
      expected: 'Attendu',
      askSelfGrade: "Rien n'a pu trancher. C'était juste ?",
      grade: { correct: "C'était juste", incorrect: "C'était faux" },
      next: 'Suivant',
      done: 'Session terminée',
    },
  },
}

// The fallback policy lives here rather than at each call site, so a boundary
// that cannot know the locale and a page that can both resolve it the same way.
export function copyFor(locale: string): SiteCopy {
  return SITE_COPY[isLocale(locale) ? locale : DEFAULT_LOCALE]
}
