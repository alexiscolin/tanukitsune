import type { Locale } from './locales'
import type { Flow } from './subject'

// The paths a screen or the queue reaches, spelled once: the two a reader navigates and the one a
// queue posts to. A screen linking to a session and the route serving it are the same string, and
// the end-to-end suite navigates by them, so two spellings of one path would let the suite pass
// against a route nobody reaches. What no screen and no queue reaches is spelled where it is used.

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

// Where a queued answer becomes durable. It carries no locale: nothing here is read by a person,
// and a batch is the same batch whichever language the session ran in.
export const BACKUP_PATH = '/api/review'

// Where a screen asks what its sitting is. It carries no locale, a deck being the same deck
// whichever language it is shown in, and the flow travels as a query for the reason the session
// route takes it that way: a lesson and a review are one thing asked two ways.
export const DECK_PATH = '/api/deck'

// Where the start screen asks how much is waiting. Separate from the deck, because a count needs
// what is waiting and not what each item is, which is the difference between that screen opening at
// once and it opening after the whole curriculum has been read.
export const DUE_PATH = '/api/due'

// Where what the backup holds is worked out and sent on. It carries no locale for the reason the
// backup does not: nothing here is read by a person. One method taking no body, because what is owed
// is worked out from the rows the server holds rather than named by whoever calls.
export const FLUSH_PATH = '/api/flush'

// The secret travels in a cookie the browser sets aside and script cannot read, rather than in a
// value the page carries. A page carrying it puts it in the document, and a document is what the
// service worker holds on disk: the copy would outlive the tab, the rotation and the reader.
//
// It is still a cookie any visitor is handed, so it stops a caller who found the route without the
// page and nothing more. What would stop a person is authentication, which docs/specs/v0.1.md puts
// out of scope for this version.
export const BACKUP_SECRET_COOKIE = 'tanukitsune-sync'

// How many rows one request may carry, spelled beside the path for the same reason: a sender
// paging at one number against a boundary refusing at another meets a refusal that resending
// cannot clear. Postgres binds one parameter per column per row and refuses a statement past
// 65535 of them, which an eighteen-column row reaches somewhere past three thousand; the room
// between that and this is what a column added later may spend.
export const BATCH_LIMIT = 500
