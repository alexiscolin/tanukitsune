import { parseBatch } from '@/data/review-batch'
import { appendAnswers } from '@/data/review-events'
import { holdsSecret } from '@/data/sync-secret'

// The backup, which docs/specs/v0.1.md names beside the flush and which this is not: nothing here
// reaches WaniKani. A handler taking a batch rather than a server action, for the reasons under
// mutation transport in docs/framing.md.

export async function POST(request: Request): Promise<Response> {
  if (!holdsSecret(request)) return new Response(null, { status: 401 })

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
