'use client'

import type { Band, Subject } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// The mastery ramp: the more an item is known, the further its colour recedes toward the
// colour of the text.
const STAGE_INK: Record<Band, string> = {
  lesson: 'text-[var(--color-srs-lesson)]',
  apprentice: 'text-[var(--color-srs-apprentice)]',
  guru: 'text-[var(--color-srs-guru)]',
  master: 'text-[var(--color-srs-master)]',
  enlightened: 'text-[var(--color-srs-enlightened)]',
  burned: 'text-[var(--color-srs-burned)]',
}

// Where the card sits, last in the sheet and reached only by reading past everything else:
// nobody opens a card to learn its level, and a line that has to be scrolled to is a line
// nobody has to step over.
export function SubjectFiling({
  subject,
  copy,
  band,
}: {
  subject: Subject
  copy: SubjectCopy
  band: Band | null
}) {
  return (
    <p className="eyebrow flex flex-wrap items-center gap-2 pt-1 text-[var(--color-ink-muted)]">
      {/* Behind the band beside it by carrying no colour of its own, and never by an opacity:
          a fraction of the muted ink is a ratio the reader is shown and cannot read. */}
      {[
        copy.type[subject.type],
        `${copy.level} ${subject.level}`,
        ...(subject.jlpt === null ? [] : [`JLPT ${subject.jlpt}`]),
      ].join(' · ')}
      {/* How far this reader has taken it, the one thing on the card that is theirs rather
          than the subject's. Its colour is the mastery ramp, so the band is read before the
          word is. */}
      {band === null ? null : <span className={STAGE_INK[band]}>{copy.stage[band]}</span>}
    </p>
  )
}
