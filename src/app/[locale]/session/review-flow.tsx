'use client'

import { useEffect, useRef } from 'react'

import { questionsFor } from '@/core/review/question'
import { answerRecord } from '@/core/review/answer-record'
import type { AnsweredCard } from '@/core/review/answer-record'
import type { Question } from '@/core/review/question'
import type { Locale } from '@/core/locales'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'
import { localOutbox } from '@/data/local/outbox'
import { ScreenShell } from '@/ui/atoms/screen-shell'
import { ReviewSession } from '@/ui/organisms/review-session'

import { useDealtFromDevice } from './dealt-from-device'

// Where the review screen meets the store it writes to. It is a client component because the
// store is the browser's, and a server component cannot hand a function to one.
//
// The write is the same on both decks: the answer reaches the local queue before the card is
// allowed to leave, and it leaves the device only through the drain mounted beside this. What
// differs is what a restart does to that queue, which is why the deck says which one it is.
export function ReviewFlow({
  locale,
  questions,
  copy,
  subjectCopy,
  exitTo,
  demo,
}: {
  locale: Locale
  // Null where the account could not be reached. The cards then come from what the device holds,
  // rebuilt through the same rule the server would have used.
  questions: readonly Question[] | null
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  exitTo: string
  // The seeded deck, which starts from the top on every reload. A real account's answers are the
  // one thing here that cannot be rebuilt from anywhere, so nothing empties them.
  demo: boolean
}) {
  const held = useDealtFromDevice('review', questions)
  const emptied = useRef<Promise<void> | null>(null)

  // The deck restarting is what empties the demo's queue, whatever the drain has or has not taken
  // from it first, and a reload is the only restart there is. Held as a promise the write awaits,
  // so a first answer cannot land in front of it.
  useEffect(() => {
    if (demo) emptied.current ??= localOutbox.clear()
  }, [demo])

  const write = async (card: AnsweredCard) => {
    await emptied.current

    await localOutbox.append(
      answerRecord(card, {
        id: crypto.randomUUID(),
        locale,
        // No corpus exists for either deck yet, which is the row saying so rather than claiming a
        // reference it was not graded against.
        corpusVersion: null,
        answeredAt: new Date(),
      }),
    )
  }

  // Nothing at all until the device has answered, so the offline line never shows for the frame
  // before the cards it holds arrive.
  if (!held.ready) return null

  const dealt = questions ?? questionsFor(held.deck)

  if (dealt.length === 0)
    return (
      <ScreenShell>
        <p className="flex flex-1 items-center text-[var(--color-ink-muted)]">{copy.unreachable}</p>
      </ScreenShell>
    )

  return (
    <ReviewSession
      questions={dealt}
      copy={copy}
      subjectCopy={subjectCopy}
      exitTo={exitTo}
      onAnswered={write}
    />
  )
}
