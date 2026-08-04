import { notFound } from 'next/navigation'

import { isLocale } from '@/core/locales'
import { sessionPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'
import { SessionStart } from '@/ui/organisms/session-start'

import { due } from './waiting'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const copy = copyFor(locale)
  // What is due on the reader's own account where a token names one, and the seeded deck
  // otherwise. It is what is waiting rather than what the next session deals, since a session
  // takes ten of it.
  const waiting = await due()

  return (
    <SessionStart
      title={copy.title}
      tagline={copy.tagline}
      copy={copy.start}
      demo={waiting.demo}
      queues={{
        lesson: { count: waiting.lessons, href: sessionPath(locale, 'lesson') },
        review: { count: waiting.reviews, href: sessionPath(locale, 'review') },
      }}
    />
  )
}
