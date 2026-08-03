'use client'

import type { ReactNode } from 'react'

import { SubjectGlyphFace } from '@/ui/atoms/subject-glyph-face'
import { RevealDot } from '@/ui/atoms/reveal-dot'
import { SubjectHeadline } from '@/ui/atoms/subject-headline'
import { SubjectBody } from '@/ui/molecules/subject-body'
import { useCollapse } from '@/ui/primitives/use-collapse'
import type { AnswerKind } from '@/core/answer-kind'

import type { Flow, Subject } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// Everything the source and the corpus carry about a subject, inside the reference's one
// slab. No tab, no accordion, no box, no badge. It scrolls.
//
// A question shows none of it. On the exercise the keyboard is open and the screen is cut in
// half, so the card is the character and the rule the answer is written on, and nothing
// else has room to exist. A lesson has no keyboard and opens whole.

// The box, in rem, full and collapsed, and how much of itself the glyph loses on the way.
//
// The collapsed height is not free: a transform scales what is painted and not what is laid
// out, so the glyph still occupies its full box inside a box that has shrunk. Below the
// largest glyph at its smallest, plus the padding under it, the box crops the character from
// the top. GLYPH_SHORT is therefore derived from the other two rather than chosen: 5.5rem of
// glyph at four tenths of itself, plus the 1.5rem it sits above, leaves headroom at 4.25.
const GLYPH_TALL = 8.5
const GLYPH_SHORT = 4.25
const GLYPH_SHRINK = 0.6

export function SubjectCard({
  subject,
  copy,
  flow,
  revealed,
  asked,
  answer,
  foot,
  onReveal,
}: {
  subject: Subject
  copy: SubjectCopy
  flow: Flow
  revealed: boolean
  // Which of the two questions was asked, when one was. It decides what the headline under
  // the character carries, because the headline is the answer: asked for a reading, a card
  // that opens on its meaning answers a question nobody put.
  asked?: AnswerKind
  // Where the answer is written, under the character and centred on it. A slot rather than a
  // prop of this card, because what is typed belongs to the loop and the card only lends it
  // the middle of the screen.
  answer?: ReactNode
  // Whatever the screen wants at the foot of the card, beside the one control. Left empty
  // while the card is still a question.
  foot?: ReactNode
  onReveal?: () => void
}) {
  // A lesson is never hidden: there is nothing to recall yet, so holding it back would only
  // make the reader tap before being taught.
  const open = flow === 'lesson' || revealed
  const { gone, follow } = useCollapse()

  return (
    <article className="flex h-full flex-col rounded-3xl bg-[var(--color-surface)] px-8 pt-5 pb-8 shadow-card sm:px-10 sm:pb-10">

      {/* Both zones have a height of their own, and neither is negotiable. A character sits
          in the middle of a fixed box rather than sizing one, so it lands in the same place
          whatever it is and stays there when the sheet opens under it: the ink of a Japanese
          glyph reaches past the em box it is set in, and a box that shrinks around it is a
          character that climbs out of the card. */}
      {/* The box shrinks and the character scales inside it. Two properties rather than one
          because only the box can give space back, and only the transform can shrink the
          glyph without asking for a second layout on every scrolled pixel. */}
      {/* The zone owns the whole band between the top of the card and the sheet, which is why
          the card carries no padding above it: the character is centred in what the reader
          sees as empty, and no part of that emptiness belongs to something else. */}
      <div
        className="flex shrink-0 items-end justify-center overflow-hidden pb-6"
        style={{ height: `${GLYPH_TALL - (GLYPH_TALL - GLYPH_SHORT) * gone}rem` }}
      >
        {/* Low in the band rather than centred in it: the character reads as belonging to the
            sheet under it, and the empty top of the card is where the eye enters. Scaled from
            its own floor, so scrolling sinks it instead of lifting it. */}
        <div className="origin-bottom" style={{ transform: `scale(${1 - GLYPH_SHRINK * gone})` }}>
          <SubjectGlyphFace subject={subject} />
        </div>
      </div>

      {/* Kept whenever the flow has an answer at all, empty included, so the sheet does not
          climb when a reader gives up instead of typing. A lesson passes none, and gives the
          whole of that height back to what it is teaching. */}
      {answer === undefined || answer === null ? null : (
        <div className="flex h-16 shrink-0 items-start justify-center">{answer}</div>
      )}

      {open ? (
        // Faded rather than cut: a list that scrolls under a fixed card has no edge of its
        // own, and a hard stop reads as the end of the content instead of the end of the
        // window onto it. The top end only fades once there is something above to fade, which
        // is what removes the band of padding a permanent one would need to stay clear of.
        <div
          onScroll={follow}
          // The one region on the card that scrolls, so the one that owes a tab stop: reached
          // by pointer and by touch and by nothing else, it would show a keyboard reader the
          // readings and hide the mnemonic, the patterns and every sentence under them.
          tabIndex={0}
          className={`no-scrollbar animate-drift flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-fade ${
            gone > 0 ? 'mask-fade-y' : 'mask-fade-b'
          }`}
        >
          <SubjectHeadline subject={subject} copy={copy} asked={asked} />
          <SubjectBody subject={subject} copy={copy} flow={flow} asked={asked} />
        </div>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      {/* The foot of the card, and the only row that survives the sheet: what was written on
          the left, the one control on the right. It keeps the height the control gives it
          whether or not anything was written, so nothing above it moves when an answer
          lands. */}
      {onReveal === undefined && foot === undefined ? null : (
        <div className="flex items-center justify-between gap-4 pt-4">
          {foot ?? <span />}
          {onReveal === undefined ? null : (
            <RevealDot revealed={revealed} listens={subject.hasAudio} copy={copy} onReveal={onReveal} />
          )}
        </div>
      )}
    </article>
  )
}
