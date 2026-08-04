import { notFound } from 'next/navigation'

import { isLocale } from '@/core/locales'
import { sessionPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'
import { FLOWS } from '@/core/subject'
import { SessionStart } from '@/ui/organisms/session-start'

import { waiting } from './waiting'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const copy = copyFor(locale)
  // The reader's own account where a token names one, the seeded deck otherwise, and the same
  // two decks the session then deals: a count read from somewhere else can disagree with what
  // the session opens on.
  const queues = await waiting(FLOWS)

  return (
    <SessionStart
      title={copy.title}
      tagline={copy.tagline}
      copy={copy.start}
      demo={queues.demo}
      queues={{
        lesson: { count: queues.lessons.length, href: sessionPath(locale, 'lesson') },
        review: { count: queues.reviews.length, href: sessionPath(locale, 'review') },
      }}
    />
  )
}
