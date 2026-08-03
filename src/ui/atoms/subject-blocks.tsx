'use client'

import Image from 'next/image'

import type { ReactNode } from 'react'

import { Eyebrow } from '@/ui/atoms/session-chrome'
import { acceptedIn, refusedIn } from '@/core/subject'
import type { Component, Reading, Subject } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// The one raised-in-reverse surface the card has: a well, sunk into the slab rather than
// lifted off it, so the two blocks that explain the character rather than state a fact about
// it are found while scrolling instead of being read for. It is the only place in the
// interface where anything is enclosed, and it encloses exactly one thing.
export function Well({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-[var(--color-surface-sunken)] p-5">
      {children}
    </div>
  )
}

// The leaves the sheet is made of. They are here rather than beside the card because they are
// the whole of what keeps it lean under load: one shape, a label in small capitals and its
// value under it, and the only line ever drawn is the hairline between two of them.

// Every block wears this, so the card is one rhythm however much it carries.
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--color-hairline)] pt-5 first:border-0 first:pt-0">
      <Eyebrow tone="muted">{label}</Eyebrow>
      {children}
    </div>
  )
}

// Grouped by kind and written in the script the convention gives each: katakana for a
// reading borrowed from Chinese, hiragana for one that was already Japanese. The script
// carries the distinction and the label only confirms it.
// A kind with no reading at all has no block. A kind whose readings are all listed without
// being accepted still has one, because those readings are real and worth learning: the
// source sends six kun'yomi on 下 and accepts none of them as an answer, and dropping them
// would teach that the character has two readings when it has eight. Accepted ones carry the
// weight, the rest recede and say why once.
export function ReadingBlock({
  readings,
  copy,
}: {
  readings: readonly Reading[]
  copy: SubjectCopy
}) {
  const kinds = [...new Set(readings.map((reading) => reading.type))]

  return (
    <>
      {kinds.map((kind) => {
        const mine = readings.filter((reading) => reading.type === kind)
        const answerable = acceptedIn(mine)
        const listed = refusedIn(mine)

        return (
          <Block
            key={kind ?? 'plain'}
            label={kind === null ? copy.plainReading : copy.reading[kind]}
          >
            {answerable.length === 0 ? null : (
              <p lang="ja" className="text-xl leading-relaxed">
                {answerable.join(' · ')}
              </p>
            )}
            {listed.length === 0 ? null : (
              <p lang="ja" className="text-sm text-[var(--color-ink-muted)]">
                {listed.join(' · ')}
                <span className="eyebrow ml-2">{copy.alsoShown}</span>
              </p>
            )}
          </Block>
        )
      })}
    </>
  )
}

export function Prose({ label, text }: { label: string; text: string | null }) {
  if (text === null) return null

  return (
    <Block label={label}>
      <p className="text-sm leading-relaxed text-pretty">{text}</p>
    </Block>
  )
}

export function Line({
  label,
  values,
  struck,
}: {
  label: string
  values: readonly string[]
  struck?: boolean
}) {
  if (values.length === 0) return null

  return (
    <Block label={label}>
      {/* The rule through it says refused, and it says it alone: an opacity over the top would
          put the words under the contrast floor to repeat what the rule already carries. */}
      <p className={`text-sm ${struck === true ? 'line-through' : ''}`}>
        {values.join(', ')}
      </p>
    </Block>
  )
}

// A composition is glyphs, not a list: the reader has to see the pieces to recognise them
// in the next character, and their meanings sit under them at label size.
export function Strip({ label, parts }: { label: string; parts: readonly Component[] }) {
  if (parts.length === 0) return null

  return (
    <Block label={label}>
      <div className="flex flex-wrap gap-6 pt-1">
        {parts.map((part) => (
          <span key={part.id} className="flex flex-col items-center gap-1">
            <span lang="ja" className="text-2xl leading-none font-light">
              {part.characters}
            </span>
            <span className="eyebrow text-[var(--color-ink-muted)]">{part.meaning}</span>
          </span>
        ))}
      </div>
    </Block>
  )
}

// What a list of meanings never teaches: which particle follows the word and what it takes.
// The pattern is set in Japanese at reading size, its gloss quiet underneath.
export function Patterns({ subject, label }: { subject: Subject; label: string }) {
  if (subject.patterns.length === 0) return null

  return (
    <Block label={label}>
      <div className="flex flex-col gap-3 pt-1">
        {subject.patterns.map((pattern) => (
          <span key={pattern.pattern} className="flex flex-col gap-0.5">
            <span lang="ja" className="text-base leading-snug">
              {pattern.pattern}
            </span>
            <span className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {pattern.gloss}
            </span>
          </span>
        ))}
      </div>
    </Block>
  )
}

export function Sentences({ subject, label }: { subject: Subject; label: string }) {
  if (subject.sentences.length === 0) return null

  return (
    <Block label={label}>
      <div className="flex flex-col gap-4 pt-1">
        {subject.sentences.map((sentence, at) => (
          <span
            key={sentence.ja}
            className="animate-drift flex flex-col gap-1"
            style={{ animationDelay: `${120 + at * 90}ms` }}
          >
            <span lang="ja" className="text-sm leading-relaxed">
              {sentence.ja}
            </span>
            <span className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {sentence.fr}
            </span>
          </span>
        ))}
      </div>
    </Block>
  )
}

// A single character is the whole screen, and a word gives that room back per character it
// adds. Read off the length rather than off the type, because the type does not predict it:
// the source sends a vocabulary of one character and one of six, and at a size chosen for the
// type the second runs past both edges of the card.
function sizeFor(characters: string): string {
  if (characters.length <= 1) return 'text-6xl'
  if (characters.length === 2) return 'text-5xl'
  if (characters.length <= 4) return 'text-4xl'

  return 'text-2xl'
}

// The subject's own glyph, and the only one the reader is meant to read: a radical with no Unicode
// character arrives as an SVG, sized against the type rather than given a box.
export function GlyphFace({ subject }: { subject: Subject }) {
  if (subject.characters === null) {
    // A black vector drawn for a pale ground, served without the headers that would let it be
    // used as a mask, so it is turned over on the dark ground instead. Unoptimised on purpose:
    // putting a vector through a raster optimiser costs a request and returns the same file.
    // The alternative text is the meaning, because that is what the shape says.
    return (
      <Image
        src={subject.characterImage ?? ''}
        alt={subject.meanings[0]?.text ?? ''}
        width={80}
        height={80}
        unoptimized
        // Never deferred: this is the subject of the card, not something further down it, and
        // the lazy loader does not fire reliably for it inside a scrolling container. A glyph
        // that arrives late is a question the reader cannot read.
        loading="eager"
        className="inked-art size-20 object-contain"
      />
    )
  }

  return (
    <h1
      lang="ja"
      // The line box is the em box and nothing more. The empty band a leading of 1.25 leaves
      // under a Japanese glyph is what reads as a gap before the sheet, and the fixed box
      // around this one is what makes taking it away safe.
      className={`text-center leading-none font-light tracking-tight ${sizeFor(subject.characters)}`}
    >
      {subject.characters}
    </h1>
  )
}
