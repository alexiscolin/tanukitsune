import { BACKUP_SECRET_HEADER } from '@/core/routes'
import { env } from '@/data/env'
import { parseBatch } from '@/data/review-batch'
import { appendAnswers } from '@/data/review-events'

// The flush is a route handler taking a batch rather than a server action, for the reasons in
// docs/framing.md under mutation transport: forty queued answers would otherwise become forty
// serialised round trips through an identifier that rotates on deploy, which is exactly what a
// client returning from offline no longer has.
//
// Authorisation is checked inside the handler and not by a matcher, which AGENTS.md says is not a
// security boundary. An absent secret closes the route rather than opening it: a deployment that
// lost the variable would otherwise accept a batch from anyone who found the path.

export async function POST(request: Request): Promise<Response> {
  const expected = env.TANUKITSUNE_SYNC_SECRET
  const offered = request.headers.get(BACKUP_SECRET_HEADER)

  if (expected === undefined || offered !== expected) return new Response(null, { status: 401 })

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
