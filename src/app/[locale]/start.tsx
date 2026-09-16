'use client'

import { useRouter } from 'next/navigation'

import { DEMO_DECK, DEMO_SUBJECTS_ASKED } from '@/core/demo-deck'
import type { Locale } from '@/core/locales'
import { KEY_PATH, sessionPath } from '@/core/routes'
import type { SiteCopy } from '@/core/site-copy'
import { SessionStart } from '@/ui/organisms/session-start'

import { KeyForm } from '@/ui/molecules/key-form'

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
  held,
}: {
  locale: Locale
  copy: SiteCopy
  demo: boolean
  // The account this browser holds a key for, read on the server where the cookie is.
  held: { username: string; level: number } | null
}) {
  const router = useRouter()
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
      signIn={
        <KeyForm
          copy={copy.start.key}
          held={held}
          onKey={(key) => handOver(key, router)}
          onForget={() => forget(router)}
        />
      }
      queues={{
        lesson: { count: counts.lessons, href: sessionPath(locale, 'lesson') },
        review: { count: counts.reviews, href: sessionPath(locale, 'review') },
      }}
    />
  )
}

// The key leaves the field and goes to the route, which is the only place that can set a cookie the
// server will read. The answer names the account, and the screen is asked for again so the queues it
// holds are that account's rather than the demo's.
async function handOver(
  key: string,
  router: { refresh: () => void },
): Promise<{ username: string; level: number } | null> {
  const answered = await fetch(KEY_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key }),
  }).catch(() => null)

  if (answered === null || !answered.ok) return null

  const held = (await answered.json()) as { username: string; level: number }
  router.refresh()

  return held
}

async function forget(router: { refresh: () => void }): Promise<void> {
  await fetch(KEY_PATH, { method: 'DELETE' }).catch(() => null)
  router.refresh()
}
