'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode, UIEvent } from 'react'

import { GlyphFace, Line, Patterns, Prose, ReadingBlock, Sentences, Strip, Well } from '@/ui/atoms/subject-blocks'
import { acceptedIn, bandOf, refusedIn } from '@/core/subject'
import type { AnswerKind } from '@/core/answer-kind'

import type { Band, Flow, Subject } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// Everything the source and the corpus carry about a subject, inside the reference's one
// slab. The rule that keeps it lean under that load: there is a single shape, a label in
// small capitals and its value under it, and the only line ever drawn is the hairline
// between two of them. No tab, no accordion, no box, no badge. It scrolls.
//
// A question shows none of it. On the exercise the keyboard is open and the screen is cut in
// half, so the card is the character and the rule the answer is written on, and nothing
// else has room to exist. A lesson has no keyboard and opens whole.

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

// Over how many scrolled pixels the character gives up its room. Short enough that the first
// pull already answers, long enough that a flick does not snap it away.
const COLLAPSE_OVER = 140

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


// How far the sheet has been pulled up, and the handler that follows it. A momentum scroll
// fires every few pixels and each event renders the whole sheet, so the reading is coalesced
// to one a frame, and a card that leaves mid-scroll takes its pending frame with it.
function useCollapse() {
  const [gone, setGone] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  function follow(event: UIEvent<HTMLDivElement>) {
    if (frame.current !== null) return

    const sheet = event.currentTarget
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      setGone(Math.min(sheet.scrollTop / COLLAPSE_OVER, 1))
    })
  }

  return { gone, follow }
}

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
  const band = bandOf(subject.srsStage)
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
          <GlyphFace subject={subject} />
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
          <Headline subject={subject} copy={copy} asked={asked} />
          <SubjectBody subject={subject} copy={copy} flow={flow} band={band} asked={asked} />
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

// The answer where the eye already is, under the character and centred on it, with no label
// over it: on a card that has just opened it is the one thing the reader came for, and a
// heading would announce what is already the largest text in the sheet. It scrolls with the
// rest rather than sitting above it, so the sheet is one surface and not a header over a list.
function Headline({
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

// Where the card sits, last in the sheet and reached only by reading past everything else:
// nobody opens a card to learn its level, and a line that has to be scrolled to is a line
// nobody has to step over.
function Filing({
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

// The order is the order it is learnt in: what it means, what that really covers, how it is
// read, how to keep it, what it is made of, and only then how it behaves in a sentence.
function SubjectBody({
  subject,
  copy,
  flow,
  band,
  asked,
}: {
  subject: Subject
  copy: SubjectCopy
  flow: Flow
  band: Band | null
  asked?: AnswerKind
}) {
  return (
    <>
      {/* The one the headline is not. Asked for a reading, the meaning is what the reader
          still has to be told, and it takes a heading here rather than the middle. */}
      {asked === 'reading' ? (
        <Line
          label={copy.meaning}
          values={acceptedIn(subject.meanings)}
        />
      ) : null}
      <Prose label={copy.nuance} text={subject.nuance} />
      <Line label={copy.synonyms} values={subject.synonyms} />
      {/* An untyped reading is exactly what the headline already carries, so it is dropped
          there and kept everywhere it says something more: on'yomi and kun'yomi are a
          distinction no single line can make. */}
      <ReadingBlock
        copy={copy}
        readings={
          asked === 'reading'
            ? subject.readings.filter((reading) => reading.type !== null)
            : subject.readings
        }
      />
      {/* What the character is made of, then how to keep it, in that order and inside the
          well: the pieces are what the mnemonic is built out of, so reading them second means
          reading the story before its words. */}
      {subject.components.length === 0 && subject.mnemonic === null ? null : (
        <Well>
          <Strip label={copy.components} parts={subject.components} />
          <Prose label={copy.mnemonic} text={subject.mnemonic} />
        </Well>
      )}
      <Prose label={copy.yourNote} text={subject.meaningNote} />
      <Prose label={copy.yourNote} text={subject.readingNote} />
      <Strip label={copy.usedIn} parts={subject.usedIn} />
      <Strip label={copy.similar} parts={subject.similar} />
      <Line label={copy.wordType} values={subject.partsOfSpeech} />
      <Patterns subject={subject} label={copy.patterns} />
      <Sentences subject={subject} label={copy.sentences} />

      {/* An answer the source refuses outright, whatever a tier would have decided. Shown
          while teaching, where knowing what will not be accepted is the lesson, and never
          during recall, where it would be the answer. */}
      {flow === 'lesson' ? (
        <Line label={copy.never} values={subject.refused} struck />
      ) : null}

      <Filing subject={subject} copy={copy} band={band} />
    </>
  )
}

// The single vermillon dot. It breathes while there is something to reveal, and becomes the
// pronunciation control on a subject that carries audio.
function RevealDot({
  revealed,
  listens,
  copy,
  onReveal,
}: {
  revealed: boolean
  listens: boolean
  copy: SubjectCopy
  onReveal: () => void
}) {
  // Revealed, the card has nothing left to give up, so the control is spent: nothing plays the
  // audio yet, and a control that answers to nothing is worse than one that says it is done.
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        if (!revealed) onReveal()
      }}
      disabled={revealed}
      aria-label={revealed && listens ? copy.listen : copy.reveal}
      className={`pressable ease-out-soft grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] outline-none transition-opacity duration-700 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-surface)] ${
        revealed ? 'opacity-30' : 'animate-breathe'
      }`}
    >
      {revealed && listens ? (
        <span aria-hidden className="flex items-end gap-1">
          <span className="h-2 w-px bg-[var(--color-success-foreground)]" />
          <span className="h-4 w-px bg-[var(--color-success-foreground)]" />
          <span className="h-3 w-px bg-[var(--color-success-foreground)]" />
        </span>
      ) : null}
    </button>
  )
}
