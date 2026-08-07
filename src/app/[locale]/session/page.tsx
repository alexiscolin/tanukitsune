import { notFound } from 'next/navigation'

import { isLocale } from '@/core/locales'
import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'
import { isFlow } from '@/core/subject'
import { env } from '@/data/env'
import { LessonSession } from '@/ui/organisms/lesson-session'

import { BackupDrain } from '../backup-drain'
import { HoldDeck } from '../hold-deck'
import { lessonDeck, reviewDeck } from '../waiting'
import { ReviewFlow } from './review-flow'

// The loop, whichever of the two flows is being run. Which one is a state of this route rather
// than a route of its own, because a lesson and a review are entered the same way and left the
// same way, and docs/specs/v0.1.md gives the product two routes.
//
// A flow nobody named is not found rather than guessed: a route that picked one would start a
// session the reader did not ask for, and no step of the loop is reached by navigating.
export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const { flow } = await searchParams
  if (!isLocale(locale)) notFound()
  if (typeof flow !== 'string' || !isFlow(flow)) notFound()

  const copy = copyFor(locale)
  const start = startPath(locale)

  // Both screens carry their own shell, because they are full bleed and own their gutters. Each
  // asks for its own deck, so the other queue's subjects are never read to build cards nobody
  // opens.
  if (flow === 'lesson') {
    const lesson = await lessonDeck()

    return (
      <>
        <HoldDeck subjects={lesson.held.subjects} waiting={lesson.held.waiting} />
        <LessonSession
          deck={lesson.cards}
          copy={copy.review}
          subjectCopy={copy.subject}
          exitTo={start}
        />
      </>
    )
  }

  const review = await reviewDeck()
  // Read here because only the server can, and served to the page that sends it. Absent means no
  // backup is configured and no drain starts at all, which is the one branch there is.
  //
  // It rides this route rather than the layout because this one is rendered per request, the flow
  // arriving in the query. A layout carrying the secret would be prerendered with whatever the
  // build held, which puts a secret in a document a shared cache may keep and leaves a deployment
  // that set the variable afterwards with a drain that never starts.
  const secret = env.TANUKITSUNE_SYNC_SECRET

  return (
    <>
      {secret !== undefined && <BackupDrain secret={secret} />}
      <HoldDeck subjects={review.held.subjects} waiting={review.held.waiting} />
      <ReviewFlow
        locale={locale}
        questions={review.cards}
        copy={copy.review}
        subjectCopy={copy.subject}
        exitTo={start}
        demo={review.demo}
      />
    </>
  )
}
