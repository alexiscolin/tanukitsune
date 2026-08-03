'use client'

import { acceptedIn, refusedIn } from '@/core/subject'
import type { AnswerKind } from '@/core/answer-kind'
import type { Subject } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// The answer where the eye already is, under the character and centred on it, with no label
// over it: on a card that has just opened it is the one thing the reader came for, and a
// heading would announce what is already the largest text in the sheet. It scrolls with the
// rest rather than sitting above it, so the sheet is one surface and not a header over a list.
export function SubjectHeadline({
  subject,
  copy,
  asked,
}: {
  subject: Subject
  copy: SubjectCopy
  asked?: AnswerKind
}) {
  const answers = asked === 'reading' ? subject.readings : subject.meanings

  const listed = refusedIn(subject.meanings)

  return (
    <>
      <p
        lang={asked === 'reading' ? 'ja' : undefined}
        className="text-center text-xl leading-tight font-medium tracking-tight text-balance"
      >
        {acceptedIn(answers).join(asked === 'reading' ? ' · ' : ', ')}
      </p>
      {/* Under it and never as a section of its own: what these words are is a qualification
          of the line above them, and a heading would announce them as a second kind. */}
      {asked === 'reading' || listed.length === 0 ? null : (
        <p className="text-center text-sm text-[var(--color-ink-muted)]">
          {listed.join(', ')}
          <span className="eyebrow ml-2">{copy.alsoShown}</span>
        </p>
      )}
    </>
  )
}
