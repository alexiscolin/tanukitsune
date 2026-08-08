import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

import { BACKUP_SECRET_COOKIE } from '@/core/routes'
import { env } from '@/data/env'

// What the two routes a queue posts to require of a caller, held once because they require the same
// thing and a second reading of one rule is a route that drifts open. What sets the cookie is
// sync-cookie.ts, apart because the middleware that sets it runs where `node:crypto` does not.
//
// An absent secret closes a route rather than opening it: a deployment that lost the variable would
// otherwise accept a request from anyone who found the path.

// Compared as digests of a fixed width rather than as text. A string comparison returns on the
// first byte that differs, so the length of the secret and the length of a correct prefix are both
// readable in how long the refusal took, against routes with no rate limit guarding a table
// nothing can correct.
function matches(offered: string | undefined, expected: string): boolean {
  if (offered === undefined) return false

  const digest = (value: string): Buffer => createHash('sha256').update(value).digest()

  return timingSafeEqual(digest(offered), digest(expected))
}

// Parsed here rather than through the framework's helper, because a route handler reads its own
// request and the helper reads the one the framework is holding, which is not the same object in a
// handler that was called rather than rendered.
//
// Split at the first `=` and no other: a value may contain them, and base64 is the ordinary way to
// write a long random string, so cutting at every one refuses exactly the secrets a reader is most
// likely to generate. Percent-decoded, matching how it was written.
function cookie(request: Request, name: string): string | undefined {
  for (const pair of (request.headers.get('cookie') ?? '').split(';')) {
    const at = pair.indexOf('=')
    if (at === -1) continue
    if (pair.slice(0, at).trim() !== name) continue

    try {
      return decodeURIComponent(pair.slice(at + 1))
    } catch {
      // Not something this ever wrote, so it is not the secret whatever it is.
      return undefined
    }
  }

  return undefined
}

export function holdsSecret(request: Request): boolean {
  const expected = env.TANUKITSUNE_SYNC_SECRET

  return expected !== undefined && matches(cookie(request, BACKUP_SECRET_COOKIE), expected)
}
