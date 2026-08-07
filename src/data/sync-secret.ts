import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

import { BACKUP_SECRET_HEADER } from '@/core/routes'
import { env } from '@/data/env'

// What the two routes a queue posts to require of a caller, held once because they require the
// same thing and a second reading of one rule is a route that drifts open.
//
// An absent secret closes a route rather than opening it: a deployment that lost the variable
// would otherwise accept a request from anyone who found the path.

// Compared as digests of a fixed width rather than as text. A string comparison returns on the
// first byte that differs, so the length of the secret and the length of a correct prefix are both
// readable in how long the refusal took, against routes with no rate limit guarding a table
// nothing can correct.
function matches(offered: string | null, expected: string): boolean {
  if (offered === null) return false

  const digest = (value: string): Buffer => createHash('sha256').update(value).digest()

  return timingSafeEqual(digest(offered), digest(expected))
}

export function holdsSecret(request: Request): boolean {
  const expected = env.TANUKITSUNE_SYNC_SECRET

  return expected !== undefined && matches(request.headers.get(BACKUP_SECRET_HEADER), expected)
}
