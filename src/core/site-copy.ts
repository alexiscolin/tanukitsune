import { DEFAULT_LOCALE, isLocale } from './locales'
import type { Locale } from './locales'

export type SiteCopy = {
  readonly title: string
  readonly tagline: string
  readonly notFound: string
  readonly error: string
  readonly retry: string
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
  },
}

// The fallback policy lives here rather than at each call site, so a boundary
// that cannot know the locale and a page that can both resolve it the same way.
export function copyFor(locale: string): SiteCopy {
  return SITE_COPY[isLocale(locale) ? locale : DEFAULT_LOCALE]
}
