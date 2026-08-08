'use client'

import { DEMO_DECK, DEMO_SUBJECTS_ASKED } from '@/core/demo-deck'
import type { Locale } from '@/core/locales'
import { sessionPath } from '@/core/routes'
import type { SiteCopy } from '@/core/site-copy'
import { SessionStart } from '@/ui/organisms/session-start'

import { useWaitingCounts } from './waiting-counts'

// Where a session starts, asking for its own counts. The document is one shell for every reader of
// a deployment, so what is waiting arrives here: a page carrying a queue is a page per reader, and
// the service worker holds that document on disk.
//
// The seeded deck needs no request at all, being a constant already in this bundle, which is what
// lets the demo open with no network on a device that has never been online.
export function Start({
  locale,
  copy,
  demo,
}: {
  locale: Locale
  copy: SiteCopy
  demo: boolean
}) {
  const counts = useWaitingCounts(
    demo ? { counted: true, lessons: DEMO_DECK.length, reviews: DEMO_SUBJECTS_ASKED } : null,
  )

  // Thrown while rendering, which is the only place the error boundary can see it.
  if (counts.broke !== undefined) throw counts.broke

  return (
    <SessionStart
      title={copy.title}
      tagline={copy.tagline}
      copy={copy.start}
      demo={demo}
      pending={!counts.counted}
      queues={{
        lesson: { count: counts.lessons, href: sessionPath(locale, 'lesson') },
        review: { count: counts.reviews, href: sessionPath(locale, 'review') },
      }}
    />
  )
}
