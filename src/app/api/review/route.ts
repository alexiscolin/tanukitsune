import { createHash, timingSafeEqual } from 'node:crypto'

import { BACKUP_SECRET_HEADER } from '@/core/routes'
import { env } from '@/data/env'
import { parseBatch } from '@/data/review-batch'
import { appendAnswers } from '@/data/review-events'

// The backup, which docs/specs/v0.1.md names beside the flush and which this is not: nothing here
// reaches WaniKani. A handler taking a batch rather than a server action, for the reasons under
// mutation transport in docs/framing.md.
//
// An absent secret closes the route rather than opening it: a deployment that lost the variable
// would otherwise accept a batch from anyone who found the path.

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

  // The body is composed here rather than passed through, so what the table reports and what a
  // caller reads can move apart. A 200 already says every row sent is durable; the count says
  // whether the batch was new, which nothing else can see from outside.
  return Response.json(
    { appended: await appendAnswers(batch) },
    { headers: { 'cache-control': 'no-store' } },
  )
}
