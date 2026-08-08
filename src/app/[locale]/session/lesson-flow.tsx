'use client'

import { DEMO_DECK } from '@/core/demo-deck'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'
import { ScreenShell } from '@/ui/atoms/screen-shell'
import { LessonSession } from '@/ui/organisms/lesson-session'

import { useSitting } from './sitting'

// The lesson screen, which asks for its own sitting: the page it sits in is one shell for everyone,
// so what a reader is taught arrives here rather than in the document. It writes nothing, a lesson
// teaching rather than asking.
export function LessonFlow({
  copy,
  subjectCopy,
  exitTo,
}: {
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  exitTo: string
}) {
  const sitting = useSitting('lesson')

  if (!sitting.ready) return null

  const deck = sitting.demo ? DEMO_DECK : sitting.deck

  if (deck.length === 0)
    return (
      <ScreenShell>
        <p className="flex flex-1 items-center text-[var(--color-ink-muted)]">{copy.unreachable}</p>
      </ScreenShell>
    )

  return <LessonSession deck={deck} copy={copy} subjectCopy={subjectCopy} exitTo={exitTo} />
}
