'use client'

import Image from 'next/image'

import type { Subject } from '@/core/subject'

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
