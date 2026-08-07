import type { Assignment } from '@/core/knowledge-source'
import { flush } from '@/core/review/flush'
import type { Sent } from '@/core/review/flush'
import { questionsFor } from '@/core/review/question'
import type { Asked, Submission } from '@/core/review/submission'
import { submissionsFor } from '@/core/review/submission'
import type { Subject } from '@/core/subject'
import { env } from '@/data/env'
import {
  claimForFlush,
  markDropped,
  markSent,
  releaseClaim,
  unsentAnswers,
} from '@/data/review-events'
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

// The status they answer for an item that is no longer due. They answer it for a request they cannot
// read at all as well, and nothing in the status tells the two apart, so it never decides anything
// on its own: what decides is whether the assignment is still waiting afterwards.
const REFUSED = 422

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

    const asks = questionsFor([subject]).map((question) => question.kind)

    // A subject the source has withdrawn is asked nothing at all, and nothing is not a set every
    // answer satisfies: readiness over an empty list is vacuously true, which would submit whatever
    // partial rows the reader happened to leave.
    if (asks.length > 0) asked.set(subject.id, { assignmentId, asks })
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
    const asked = askedOf(queued, subjects)

    // An answer whose subject is waiting for nothing can never be submitted: the item was finished
    // elsewhere, or it belongs to the seeded deck, or it sits above what the subscription grants.
    // Dropped rather than left, because a row nothing can resolve is one every later flush reads
    // again, and a walk that finds only those still pays the source for asking.
    await markDropped(unsent.filter((row) => !asked.has(row.subjectId)).map((row) => row.id))

    return submissionsFor(unsent, asked)
  }

  // Their created review carries no identifier worth reading back, so nothing about a failure says
  // what happened upstream. The assignment is read again instead, which answers it for every failure
  // at once: an item still waiting was not advanced, whatever the status said.
  const settle = async (submission: Submission, refused: unknown): Promise<Sent> => {
    const stillWaiting = await source
      .listWaiting()
      .then((queues) =>
        [...queues.lessons, ...queues.reviews].some((entry) => entry.id === submission.assignmentId),
      )
      .catch(() => true)

    // Held rather than dropped, and that includes a refusal we cannot read: a request they could not
    // parse answers the same status as an item that is not due, and this is the difference between
    // them. Holding keeps the answers, where dropping on a defect of ours discards them for ever.
    // The claim goes back with them, since this walk is the one holding it.
    if (stillWaiting) {
      await releaseClaim(submission.answers)

      return 'held'
    }

    // Not waiting and refused: the item was already finished, so nothing here advanced it. The row
    // records that it never reached them, which docs/framing.md calls a drop rather than an error.
    if (refused instanceof Error && refused.message.includes(`answered ${REFUSED}`)) {
      await markDropped(submission.answers)

      return 'dropped'
    }

    // Not waiting and lost in flight: the submission landed and the answer carrying its stage is
    // what went missing. The row records that it was applied and leaves the stage unfilled, which is
    // the honest shape rather than a number nobody read.
    await markSent(submission.answers, null, new Date())

    return 'applied'
  }

  const send = async (submission: Submission): Promise<Sent> => {
    // Taken before it is sent, and the taking is atomic: two walks reaching these rows means exactly
    // one of them is handed the rows and the other is handed nothing. The Web Lock the page holds
    // cannot make that true, living in one browser profile and not outliving the request, and a
    // submission is irreversible, so this is where it is made true instead.
    const at = new Date()

    if ((await claimForFlush(submission.answers, at)) !== submission.answers.length)
      return 'held'

    let advanced

    try {
      advanced = await source.submitReview(submission)
    } catch (refused) {
      return settle(submission, refused)
    }

    // Outside the attempt, so a database that failed here is not read as a source that refused: the
    // submission landed, and reading it as a refusal would send it again.
    await markSent(submission.answers, advanced.srsStage, new Date())

    return 'applied'
  }

  return Response.json(
    { sent: await flush(owed, send) },
    { headers: { 'cache-control': 'no-store' } },
  )
}
