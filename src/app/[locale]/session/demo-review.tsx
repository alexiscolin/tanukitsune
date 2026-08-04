'use client'

import { useEffect, useRef } from 'react'

import { answerRecord } from '@/core/review/answer-record'
import type { AnsweredCard } from '@/core/review/answer-record'
import type { Question } from '@/core/review/question'
import type { Locale } from '@/core/locales'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'
import { localOutbox } from '@/data/local/outbox'
import { ReviewSession } from '@/ui/organisms/review-session'

// Where the review screen meets the store it writes to. It is a client component because the
// store is the browser's, and a server component cannot hand a function to one.
//
// Demo mode runs the real write and submits nothing: the answer reaches the local queue because
// that write is part of the flow being demonstrated, and nothing leaves the device.
export function DemoReview({
  locale,
  questions,
  copy,
  subjectCopy,
  exitTo,
}: {
  locale: Locale
  questions: readonly Question[]
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  exitTo: string
}) {
  const emptied = useRef<Promise<void> | null>(null)

  // The queue nothing drains is emptied by the deck restarting, and a reload is the only restart
  // there is. Held as a promise the write awaits, so a first answer cannot land in front of it.
  useEffect(() => {
    emptied.current ??= localOutbox.clear()
  }, [])

  const write = async (card: AnsweredCard) => {
    await emptied.current

    await localOutbox.append(
      answerRecord(card, {
        id: crypto.randomUUID(),
        locale,
        // The seeded deck carries no corpus and no version of one, which is the demo saying so
        // rather than a row claiming a reference it was not graded against.
        corpusVersion: null,
        answeredAt: new Date(),
      }),
    )
  }

  return (
    <ReviewSession
      questions={questions}
      copy={copy}
      subjectCopy={subjectCopy}
      exitTo={exitTo}
      onAnswered={write}
    />
  )
}
