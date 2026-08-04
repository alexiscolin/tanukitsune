import { notFound } from 'next/navigation'

import { isLocale } from '@/core/locales'
import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'
import { isFlow } from '@/core/subject'
import { LessonSession } from '@/ui/organisms/lesson-session'

import { waiting } from '../waiting'
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
  // The one flow being run, so the other's subjects are not fetched whole to build a deck this
  // screen never opens.
  const queues = await waiting([flow])

  // Both screens carry their own shell, because they are full bleed and own their gutters.
  if (flow === 'lesson')
    return (
      <LessonSession
        deck={queues.lessons}
        copy={copy.review}
        subjectCopy={copy.subject}
        exitTo={start}
      />
    )

  return (
    <ReviewFlow
      locale={locale}
      questions={queues.reviews}
      copy={copy.review}
      subjectCopy={copy.subject}
      exitTo={start}
      demo={queues.demo}
    />
  )
}
