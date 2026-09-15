import written from '../../../corpus/fr/claimed.json'

// The words the fuzzy tier may not place a near miss on, read from the artifact `pnpm corpus:claimed`
// writes: every word this locale answers some card with, so placing a slip on one would teach the reader
// the other card rather than this one.
//
// Bundled rather than fetched: the cascade grades in the browser with the network off, before a deck is
// dealt, so a guard that arrived with the deck would be a guard absent exactly when it is needed.
//
// One locale, read the way `waiting.ts` reads DEFAULT_LOCALE: a deployment deals one deck to every
// reader of it and `LOCALES` holds one entry. A second language is a second import and an argument
// here, not a second mechanism.
export const CLAIMED: ReadonlySet<string> = new Set(written.claimed)
