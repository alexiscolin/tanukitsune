import { z } from 'zod'

import type { Asked, Submission } from '@/core/review/submission'
import { submissionsFor } from '@/core/review/submission'
import { questionsFor } from '@/core/review/question'
import { env } from '@/data/env'
import { markSent, sentAlready, unsentAnswers } from '@/data/review-events'
import { holdsSecret } from '@/data/sync-secret'
import { wanikaniSource } from '@/data/wanikani/source'

// The flush, which is the half that reaches WaniKani. Two thin handlers and no loop: the loop runs
// in the page, per docs/framing.md, and what is here is the token the page cannot hold and the rows
// the page no longer holds, a queued answer having left the device once the backup confirmed it.
//
// The read says what is left to send and the write sends one of them. Neither decides an order: the
// read hands them back oldest first and the page walks them one at a time.

const submitted = z.object({
  assignmentId: z.number().int().positive(),
  incorrectMeanings: z.number().int().nonnegative(),
  incorrectReadings: z.number().int().nonnegative(),
  answers: z.array(z.string()).min(1),
})

const noStore = { 'cache-control': 'no-store' }

// What the source will accept for one subject, which neither half of its answer holds alone: the
// assignment carries the identifier a submission names, and the subject carries which questions it
// is asked at all. `questionsFor` decides the second, so the flush and the deck ask the same rule
// rather than two spellings of it.
async function whatIsAsked(subjectIds: readonly number[], token: string) {
  const source = wanikaniSource(token, env.WANIKANI_API)
  const waiting = await source.listWaiting()
  const assignments = new Map(
    [...waiting.lessons, ...waiting.reviews].map((entry) => [entry.subjectId, entry.id]),
  )

  const known = subjectIds.filter((id) => assignments.has(id))
  const subjects = await source.listSubjects(known)
  const asked = new Map<number, Asked>()

  for (const subject of subjects) {
    const assignmentId = assignments.get(subject.id)
    if (assignmentId === undefined) continue

    asked.set(subject.id, {
      assignmentId,
      asks: questionsFor([subject]).map((question) => question.kind),
    })
  }

  return asked
}

export async function GET(request: Request): Promise<Response> {
  if (!holdsSecret(request)) return new Response(null, { status: 401 })

  const token = env.WANIKANI_TOKEN
  const unsent = await unsentAnswers()

  // Nothing to send, and a deployment holding no token has nowhere to send it: the deck it deals is
  // the seeded one, whose answers are backed up like any others and belong to no assignment.
  if (token === undefined || unsent.length === 0)
    return Response.json({ pending: [] }, { headers: noStore })

  const asked = await whatIsAsked([...new Set(unsent.map((row) => row.subjectId))], token)

  return Response.json({ pending: submissionsFor(unsent, asked) }, { headers: noStore })
}

export async function POST(request: Request): Promise<Response> {
  if (!holdsSecret(request)) return new Response(null, { status: 401 })

  const parsed = submitted.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response(null, { status: 400 })

  const submission: Submission = parsed.data

  // Read before sending, not after. Their created review carries no identifier worth reading back,
  // so a submission sent twice cannot be told from one sent once, and the second would advance the
  // item again. A row already marked means this was sent, and the answer is to stop rather than
  // repeat it.
  if (await sentAlready(submission.answers)) return new Response(null, { status: 409 })

  const token = env.WANIKANI_TOKEN
  if (token === undefined) return new Response(null, { status: 409 })

  // The switch, off everywhere but the end-to-end suite. The flush runs whole and stops here,
  // marking nothing, so the rows stay pending and no stage moves on anyone's account.
  if (env.TANUKITSUNE_UPSTREAM_WRITE === undefined)
    return Response.json({ sent: false }, { headers: noStore })

  const advanced = await wanikaniSource(token, env.WANIKANI_API).submitReview(submission)

  await markSent(submission.answers, advanced.srsStage, new Date())

  return Response.json({ sent: true, srsStage: advanced.srsStage }, { headers: noStore })
}
