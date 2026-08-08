import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

import { BACKUP_SECRET_COOKIE } from '@/core/routes'
import { env } from '@/data/env'

// What the two routes a queue posts to require of a caller, held once because they require the same
// thing and a second reading of one rule is a route that drifts open.
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
function cookie(request: Request, name: string): string | undefined {
  return (request.headers.get('cookie') ?? '')
    .split(';')
    .map((one) => one.trim().split('='))
    .find(([key]) => key === name)?.[1]
}

export function holdsSecret(request: Request): boolean {
  const expected = env.TANUKITSUNE_SYNC_SECRET

  return expected !== undefined && matches(cookie(request, BACKUP_SECRET_COOKIE), expected)
}

// Handed to the browser to keep, and never to the page. `HttpOnly` is what keeps it out of the
// document and out of script; `SameSite=Strict` is what stops another site spending it; `Secure` is
// what stops a network reading it, and localhost counts as secure so a fresh clone still works.
export function secretCookie(): string | null {
  const secret = env.TANUKITSUNE_SYNC_SECRET

  return secret === undefined
    ? null
    : `${BACKUP_SECRET_COOKIE}=${secret}; Path=/; HttpOnly; SameSite=Strict; Secure`
}
