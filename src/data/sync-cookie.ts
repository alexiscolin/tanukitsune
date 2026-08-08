import { BACKUP_SECRET_COOKIE } from '@/core/routes'
import { env } from '@/data/env'

// What the browser is handed to keep, and never the page. Set on the two routes a screen asks its
// data from and on nothing else: those answer `no-store` and the service worker never holds them,
// where a document it does hold would put the secret back on disk, which is what moving it out of
// the page was for.
//
// Apart from the check that reads it back, which needs a constant-time comparison from `node:crypto`
// that these callers have no reason to pull in.

// A year in seconds. The secret changes when a deployment changes it, and a cookie outliving that is
// refused rather than trusted, so the only thing a long life costs is one response re-issuing it.
const HELD_FOR = 60 * 60 * 24 * 365

// `HttpOnly` is what keeps it out of the document and out of script; `SameSite=Strict` is what stops
// another site spending it; `Secure` is what stops a network reading it, and localhost counts as
// secure so a fresh clone still works.
//
// Percent-encoded, because a cookie value cannot carry a semicolon, a comma, a space or a line
// break, and .env.example asks for any long random string rather than for a safe alphabet. An
// unencoded one would corrupt the header or, on a line break, make building it throw with the secret
// inside the message.
export function secretCookie(): string | null {
  const secret = env.TANUKITSUNE_SYNC_SECRET

  return secret === undefined
    ? null
    : `${BACKUP_SECRET_COOKIE}=${encodeURIComponent(secret)}; Path=/; Max-Age=${HELD_FOR}; HttpOnly; SameSite=Strict; Secure`
}
