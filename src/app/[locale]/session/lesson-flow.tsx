'use client'

import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'
import type { Subject } from '@/core/subject'
import { ScreenShell } from '@/ui/atoms/screen-shell'
import { LessonSession } from '@/ui/organisms/lesson-session'

import { useDealtFromDevice } from './dealt-from-device'

// The lesson screen beside the review one, and here for the same single reason: where the account
// could not be reached the cards come from the device, which only a client component can read. It
// writes nothing, a lesson teaching rather than asking.
export function LessonFlow({
  deck,
  copy,
  subjectCopy,
  exitTo,
}: {
  // Null where the account could not be reached.
  deck: readonly Subject[] | null
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  exitTo: string
}) {
  const held = useDealtFromDevice('lesson', deck)

  if (!held.ready) return null

  const dealt = deck ?? held.deck

  if (dealt.length === 0)
    return (
      <ScreenShell>
        <p className="flex flex-1 items-center text-[var(--color-ink-muted)]">{copy.unreachable}</p>
      </ScreenShell>
    )

  return <LessonSession deck={dealt} copy={copy} subjectCopy={subjectCopy} exitTo={exitTo} />
}
