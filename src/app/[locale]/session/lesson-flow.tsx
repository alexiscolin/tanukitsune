'use client'

import { DEMO_DECK } from '@/core/demo-deck'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'
import { SessionUnreachable } from '@/ui/molecules/session-unreachable'
import { LessonSession } from '@/ui/organisms/lesson-session'

import { useSitting } from './sitting'

// The lesson screen, which asks for its own sitting: the page it sits in is one shell for everyone,
// so what a reader is taught arrives here rather than in the document. It writes nothing, a lesson
// teaching rather than asking.
export function LessonFlow({
  copy,
  subjectCopy,
  exitTo,
  demo,
}: {
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  exitTo: string
  // Which deck this deployment serves, carried in the shell for the reason review-flow.tsx gives.
  demo: boolean
}) {
  const sitting = useSitting('lesson')

  if (!sitting.ready) return null

  // Nothing reached and nothing held, which is the one state that is not a session. An account that
  // answered with an empty queue ends on the screen that says the session is finished.
  if (!sitting.reached && !demo && sitting.deck.length === 0)
    return <SessionUnreachable copy={copy} exitTo={exitTo} />

  const deck = demo ? DEMO_DECK : sitting.deck

  return <LessonSession deck={deck} copy={copy} subjectCopy={subjectCopy} exitTo={exitTo} />
}
