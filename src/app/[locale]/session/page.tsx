import { notFound } from 'next/navigation'

import { DEMO_DECK, DEMO_QUESTIONS } from '@/core/demo-deck'
import { isLocale } from '@/core/locales'
import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'
import { isFlow } from '@/core/subject'
import { LessonSession } from '@/ui/organisms/lesson-session'

import { DemoReview } from './demo-review'

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

  // Both screens carry their own shell, because they are full bleed and own their gutters.
  // The deck is the seeded one until `KnowledgeSource` can supply assignments.
  if (flow === 'lesson')
    return (
      <LessonSession
        deck={DEMO_DECK}
        copy={copy.review}
        subjectCopy={copy.subject}
        exitTo={start}
      />
    )

  return (
    <DemoReview
      locale={locale}
      questions={DEMO_QUESTIONS}
      copy={copy.review}
      subjectCopy={copy.subject}
      exitTo={start}
    />
  )
}
