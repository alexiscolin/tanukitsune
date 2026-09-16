import { READER_ACCOUNT_COOKIE, READER_KEY_COOKIE, READER_SUBMITS_COOKIE } from '@/core/routes'

import { cookie } from './cookie'
import { sealed } from './reader-seal'

// Where a reader's WaniKani key lives while they are reviewing: in their browser, handed back on every
// request, and written to no table, no log and no page. [ADR 0017](../../docs/decisions/0017-a-key-lives-in-a-cookie.md)
// holds the decision and what it costs.
//
// The pages render on the server, so the key has to be readable there for the first render. A cookie is
// the one store that is, which is the whole reason this is a cookie rather than a header the client
// sends.

// A year in seconds. A key ends when its holder regenerates it at WaniKani or clears it here, and a
// cookie outliving either is refused by the source rather than trusted, so a long life costs nothing.
const HELD_FOR = 60 * 60 * 24 * 365

// `HttpOnly` keeps it out of script, `SameSite=Strict` stops another site spending it, and `Secure`
// keeps it off the wire in clear, with localhost counting as secure so a fresh clone still works.
//
// Percent-encoded, because a cookie value cannot carry a semicolon, a comma, a space or a line break
// and nothing says a key never will.
export function keyCookie(key: string): string {
  return `${READER_KEY_COOKIE}=${encodeURIComponent(key)}; Path=/; Max-Age=${HELD_FOR}; HttpOnly; SameSite=Strict; Secure`
}

// Signing out, which is the cookie expiring: the server keeps nothing to forget.
export function clearedKeyCookie(): string {
  return `${READER_KEY_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`
}

export function keyOn(request: Request): string | undefined {
  return cookie(request, READER_KEY_COOKIE)
}

// The account the key names, written beside it so the screen can say whose key this browser holds
// without asking WaniKani again on every render. It carries a name and a level, which the reader is
// already shown, and never the key.
export function accountCookie(held: Held, secret: string | undefined): string {
  const written = sealed(JSON.stringify(held), secret) ?? JSON.stringify(held)

  return `${READER_ACCOUNT_COOKIE}=${encodeURIComponent(written)}; Path=/; Max-Age=${HELD_FOR}; HttpOnly; SameSite=Strict; Secure`
}

// On by default, which is what a reader who hands a key over is asking for: their session advances
// their account. Off keeps the answers here and leaves WaniKani alone.
export function submitsCookie(submits: boolean, secret: string | undefined): string {
  const written = sealed(String(submits), secret) ?? String(submits)

  return `${READER_SUBMITS_COOKIE}=${encodeURIComponent(written)}; Path=/; Max-Age=${HELD_FOR}; HttpOnly; SameSite=Strict; Secure`
}

export function clearedSubmitsCookie(): string {
  return `${READER_SUBMITS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`
}

export function clearedAccountCookie(): string {
  return `${READER_ACCOUNT_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`
}

// The account a key names. The identifier is what rows are written under, so it travels signed: a
// cookie is handed back by the browser, and an identifier somebody could edit is a claim rather than a
// fact. The name and the level are shown on a screen and nothing turns on them.
export type Held = { readonly id: string; readonly username: string; readonly level: number }
