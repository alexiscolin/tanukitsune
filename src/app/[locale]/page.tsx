import { notFound } from 'next/navigation'

import { DEMO_DECK, DEMO_QUESTIONS } from '@/core/demo-deck'
import { isLocale } from '@/core/locales'
import { sessionPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'
import { SessionStart } from '@/ui/organisms/session-start'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const copy = copyFor(locale)

  // What is waiting is the seeded deck until `KnowledgeSource` can supply assignments: every
  // subject is unstudied, so the whole deck is a lesson and every question it asks is a review.
  return (
    <SessionStart
      title={copy.title}
      tagline={copy.tagline}
      copy={copy.start}
      queues={{
        lesson: { count: DEMO_DECK.length, href: sessionPath(locale, 'lesson') },
        review: { count: DEMO_QUESTIONS.length, href: sessionPath(locale, 'review') },
      }}
    />
  )
}
