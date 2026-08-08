import { notFound } from 'next/navigation'

import { isLocale } from '@/core/locales'
import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'
import { isFlow } from '@/core/subject'
import { env } from '@/data/env'

import { servesDemo } from '../waiting'

import { BackupDrain } from '../backup-drain'
import { LessonFlow } from './lesson-flow'
import { ReviewFlow } from './review-flow'

// The loop, whichever of the two flows is being run. Which one is a state of this route rather
// than a route of its own, because a lesson and a review are entered the same way and left the
// same way, and docs/specs/v0.1.md gives the product two routes.
//
// A flow nobody named is not found rather than guessed: a route that picked one would start a
// session the reader did not ask for, and no step of the loop is reached by navigating.
//
// It carries no deck. What this renders is the same document for every reader of a deployment,
// which is what lets the service worker hold one application shell and serve it with no network;
// the sitting is asked for by the screen, through /api/deck.
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

  // Both screens carry their own shell, because they are full bleed and own their gutters.
  if (flow === 'lesson')
    return (
      <LessonFlow
        copy={copy.review}
        subjectCopy={copy.subject}
        exitTo={start}
        demo={servesDemo()}
      />
    )

  // Read to decide whether a drain starts at all, and for nothing else: absent means no backup is
  // configured, which is the one branch there is. The value never leaves the server now, so the
  // document this renders carries nothing a cache must not keep.
  const secret = env.TANUKITSUNE_SYNC_SECRET

  return (
    <>
      {secret !== undefined && <BackupDrain />}
      <ReviewFlow
        locale={locale}
        copy={copy.review}
        subjectCopy={copy.subject}
        exitTo={start}
        demo={servesDemo()}
      />
    </>
  )
}
