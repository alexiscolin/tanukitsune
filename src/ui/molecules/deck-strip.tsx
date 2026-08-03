'use client'

import { useEffect, useRef } from 'react'

import { DeckGlyph } from '@/ui/atoms/deck-glyph'
import type { Subject, SubjectType } from '@/core/subject'

// The one categorical use of colour in the interface, and the strip is where it is spent.
const TYPE_FILL: Record<SubjectType, string> = {
  radical: 'bg-[var(--color-radical)]',
  kanji: 'bg-[var(--color-kanji)]',
  vocabulary: 'bg-[var(--color-vocab)]',
  kanaVocabulary: 'bg-[var(--color-kana-vocab)]',
  grammar: 'bg-[var(--color-grammar)]',
  conjugation: 'bg-[var(--color-conjugation)]',
}

// What the strip needs and nothing more: something to draw, something to key on, and the type
// whose colour the dot carries.
export type StripItem = {
  readonly key: string
  readonly characters: string
  readonly type: SubjectType
}

// The three fields are the same wherever the queue comes from; the key is not, because what
// makes an entry unique is the flow's own: a lesson pages through subjects, and a review asks
// the same subject twice, once for its meaning and once for its reading.
export function stripItemFor(subject: Subject, key: string): StripItem {
  return { key, characters: subject.characters ?? '', type: subject.type }
}

// The queue felt rather than listed, on a band of its own under the header: it is where the
// session is going, and it is read across rather than glanced at, which is what a row set
// between two fixed things cannot be.
//
// A real scroll container rather than a row that is translated, so the deck can be pushed
// through by hand as well as followed. The half-width spacers at either end are what let the
// first and the last subject reach the middle, which no padding expressed in the interface's
// own scale could do.
//
// Hidden from the accessibility tree: it repeats the subject the heading already carries, and
// a row of characters with no reading order is noise between the question and the field.
export function DeckStrip({ queue, index }: { queue: readonly StripItem[]; index: number }) {
  const row = useRef<HTMLDivElement>(null)

  // Centring is a courtesy the strip does without where nothing can scroll: an environment
  // that renders without a viewport has no such method, and a decorative row must not be what
  // brings the screen down there.
  useEffect(() => {
    const active = row.current?.children[index + 1]
    if (!(active instanceof HTMLElement) || typeof active.scrollIntoView !== 'function') return

    active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [index])

  // Snapped to the centre: the strip is a list of discrete subjects, so a push that stops
  // between two of them stops on nothing. Proximity rather than mandatory, so a long flick
  // still travels instead of catching on the very next glyph.
  return (
    <div
      aria-hidden
      className="mask-fade-x no-scrollbar mt-10 h-14 w-full snap-x snap-proximity overflow-x-auto"
    >
      <div ref={row} className="flex h-full items-center">
        <span className="w-1/2 shrink-0" />
        {queue.map((entry, at) => (
          <span
            key={entry.key}
            className="flex shrink-0 snap-center flex-col items-center gap-1.5 px-4"
          >
            <DeckGlyph characters={entry.characters} active={at === index} />
            {/* The type's own colour rather than the accent: it says what kind of subject is
                being asked, and the vermillon stays reserved for what the reader can act
                on. */}
            <span
              className={`ease-spring size-1 rounded-full transition duration-500 ${TYPE_FILL[entry.type]} ${
                at === index ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`}
            />
          </span>
        ))}
        <span className="w-1/2 shrink-0" />
      </div>
    </div>
  )
}
