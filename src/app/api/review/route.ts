import { createHash, timingSafeEqual } from 'node:crypto'

import { BACKUP_SECRET_HEADER } from '@/core/routes'
import { env } from '@/data/env'
import { parseBatch } from '@/data/review-batch'
import { appendAnswers } from '@/data/review-events'

// The backup, which docs/specs/v0.1.md names beside the flush and which this is not: nothing here
// reaches WaniKani. It is a route handler taking a batch rather than a server action, for the
// reasons in docs/framing.md under mutation transport: forty queued answers would otherwise become
// forty serialised round trips through an identifier that rotates on deploy, which is exactly what
// a client returning from offline no longer has.
//
// Authorisation is checked inside the handler and not by a matcher, which AGENTS.md says is not a
// security boundary. An absent secret closes the route rather than opening it: a deployment that
// lost the variable would otherwise accept a batch from anyone who found the path.

// Compared as digests of a fixed width rather than as text. A string comparison returns on the
// first byte that differs, so the length of the secret and the length of a correct prefix are both
// readable in how long the refusal took, against a route with no rate limit guarding a table
// nothing can correct.
function matches(offered: string | null, expected: string): boolean {
  if (offered === null) return false

  const digest = (value: string): Buffer => createHash('sha256').update(value).digest()

  return timingSafeEqual(digest(offered), digest(expected))
}

export async function POST(request: Request): Promise<Response> {
  const expected = env.TANUKITSUNE_SYNC_SECRET

  if (expected === undefined || !matches(request.headers.get(BACKUP_SECRET_HEADER), expected))
    return new Response(null, { status: 401 })

  const batch = parseBatch(await request.json().catch(() => null))

  // The batch is refused whole. A row that cannot be read is a client writing rows this server
  // cannot interpret, and storing its neighbours would leave the queue believing a partial send
  // succeeded.
  if (batch === null) return new Response(null, { status: 400 })

  return Response.json(await appendAnswers(batch), {
    // The answer says what is now durable, which is only true of this request.
    headers: { 'cache-control': 'no-store' },
  })
}
