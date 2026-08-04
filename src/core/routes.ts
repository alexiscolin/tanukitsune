import type { Locale } from './locales'
import type { Flow } from './subject'

// The two paths docs/specs/v0.1.md names, spelled once. A screen linking to a session and the
// route serving it are the same two strings, and the end-to-end suite navigates by them, so
// three spellings of one path would let the suite pass against a route nobody reaches.

// Where a session starts, which is also the manifest's entry point: an installed app opens
// here rather than inside yesterday's loop.
export function startPath(locale: Locale): string {
  return `/${locale}`
}

// The loop. Which flow it runs is a state of the route rather than a second route, since a
// lesson and a review are entered the same way and left the same way.
export function sessionPath(locale: Locale, flow: Flow): string {
  return `/${locale}/session?flow=${flow}`
}
