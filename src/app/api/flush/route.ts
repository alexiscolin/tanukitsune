import type { Assignment } from '@/core/knowledge-source'
import { flush } from '@/core/review/flush'
import type { Sent } from '@/core/review/flush'
import { questionsFor } from '@/core/review/question'
import type { Asked, Submission } from '@/core/review/submission'
import { submissionsFor } from '@/core/review/submission'
import type { Subject } from '@/core/subject'
import { env } from '@/data/env'
import { markDropped, markSent, unsentAnswers } from '@/data/review-events'
import { holdsSecret } from '@/data/sync-secret'
import { wanikaniSource } from '@/data/wanikani/source'

// The flush, which is the half that reaches WaniKani. One handler taking no body at all: what is
// owed is worked out from the rows this server holds, so nothing a caller sends can name an
// assignment or a count. The page triggers it and holds the single-flusher lock; everything the
// trigger decides is here, where the token is.
//
// A batch rather than a call per submission, which is what docs/framing.md asks of this transport:
// the reads that say what is owed cost six upstream requests, and paying them once a sitting is the
// difference between a flush and a queue of them.

// Their 422 says the item is no longer due, which is a drop and not a failure: the answer keeps its
// outcome in our history marked as not applied, and the submissions behind it are still owed.
const NOT_DUE = 422

// What the source will accept for one subject, which neither half of its answer holds alone: the
// assignment carries the identifier a submission names, and the subject carries which questions it
// is asked at all. `questionsFor` decides the second, so the flush and the deck ask the same rule
// rather than two spellings of it.
function askedOf(
  waiting: readonly Assignment[],
  subjects: readonly Subject[],
): ReadonlyMap<number, Asked> {
  const assignments = new Map(waiting.map((entry) => [entry.subjectId, entry.id]))
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

export async function POST(request: Request): Promise<Response> {
  if (!holdsSecret(request)) return new Response(null, { status: 401 })

  const token = env.WANIKANI_TOKEN

  // The switch and the token, both before anything is read. A flush that may not submit must not
  // spend the budget finding out what it would have submitted: with the switch off, no row is ever
  // marked, so every trigger would ask the same question again and get the same answer for ever.
  if (token === undefined || env.TANUKITSUNE_UPSTREAM_WRITE !== 'on')
    return Response.json({ sent: [] }, { headers: { 'cache-control': 'no-store' } })

  const source = wanikaniSource(token, env.WANIKANI_API)

  const owed = async (): Promise<readonly Submission[]> => {
    const unsent = await unsentAnswers()
    if (unsent.length === 0) return []

    const waiting = await source.listWaiting()
    const queued = [...waiting.lessons, ...waiting.reviews]
    const wanted = new Set(unsent.map((row) => row.subjectId))

    const subjects = await source.listSubjects(
      queued.filter((entry) => wanted.has(entry.subjectId)).map((entry) => entry.subjectId),
    )

    return submissionsFor(unsent, askedOf(queued, subjects))
  }

  const send = async (submission: Submission): Promise<Sent> => {
    try {
      const advanced = await source.submitReview(submission)

      await markSent(submission.answers, advanced.srsStage, new Date())

      return 'applied'
    } catch (refused) {
      return settle(submission, refused)
    }
  }

  const settle = async (submission: Submission, refused: unknown): Promise<Sent> => {
    // Dropped rather than retried, per docs/specs/v0.1.md under offline and sync: the item is not
    // due, so resending it would never succeed and would hold everything behind it for ever.
    if (refused instanceof Error && refused.message.includes(`answered ${NOT_DUE}`)) {
      await markDropped(submission.answers)

      return 'dropped'
    }

    // Everything else is uncertain, and their created review carries no identifier worth reading
    // back. So the assignment is read again rather than the submission sent again: an item that is
    // no longer waiting is one this submission advanced, whatever the network said.
    const stillWaiting = await source
      .listWaiting()
      .then((queues) =>
        [...queues.lessons, ...queues.reviews].some((entry) => entry.id === submission.assignmentId),
      )
      .catch(() => true)

    if (stillWaiting) return 'held'

    // Applied, and the stage it landed on is unreadable from here: the answer that carried it was
    // the one that was lost. The row records that it was applied and leaves the stage unfilled,
    // which is the honest shape rather than a number nobody read.
    await markSent(submission.answers, null, new Date())

    return 'applied'
  }

  return Response.json(
    { sent: await flush(owed, send) },
    { headers: { 'cache-control': 'no-store' } },
  )
}
