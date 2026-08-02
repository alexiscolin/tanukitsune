'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode, Ref } from 'react'

import type { SubjectType } from '@/core/subject'

// The one categorical use of colour in the interface, kept beside the strip and the card
// that both spend it rather than each keeping a map of its own.
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

// The interaction vocabulary both alternatives wear, kept in one file so the two are
// compared on their layout rather than on details that drifted apart while they were
// written. The rules it holds to, taken from the reference and absolute: no filled button,
// no outlined card, no chip, one accent spent once per screen, selection expressed by
// contrast and a single dot, and every entrance six pixels and a blur.



// Three hairlines of unequal width. A mark rather than a control: nothing opens yet, and a
// button that does nothing is a placeholder in the diff and a lie in the accessibility
// tree. It becomes a button on the day there is a menu behind it.
export function MenuMark() {
  return (
    <span aria-hidden className="group flex flex-col gap-1 py-2">
      <span className="ease-out-soft h-px w-6 bg-[var(--color-ink)]/70 transition-all duration-500 group-hover:w-4" />
      <span className="ease-out-soft h-px w-4 bg-[var(--color-ink)]/70 transition-all duration-500 group-hover:w-6" />
      <span className="ease-out-soft h-px w-5 bg-[var(--color-ink)]/70 transition-all duration-500 group-hover:w-3" />
    </span>
  )
}

export function Eyebrow({
  children,
  tone = 'brand',
}: {
  children: ReactNode
  tone?: 'brand' | 'muted'
}) {
  return (
    <span
      className={`eyebrow transition-colors duration-500 ${tone === 'brand' ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink-muted)]'}`}
    >
      {children}
    </span>
  )
}

// Text, weight and a dot. The action that continues is never a slab, and its underline is
// drawn from the left on hover rather than being there to begin with. The focus ring is
// offset, because a control with no container has nothing else to show a keyboard reader
// where it is.
export function GhostAction({
  children,
  onClick,
  emphasis = 'primary',
  describedBy,
  ref,
}: {
  children: ReactNode
  onClick: () => void
  emphasis?: 'primary' | 'quiet'
  describedBy?: string
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-describedby={describedBy}
      className={`pressable group relative inline-flex items-center gap-2.5 rounded-full py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-canvas)] ${
        emphasis === 'primary'
          ? 'font-medium text-[var(--color-ink)]'
          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
      }`}
    >
      {emphasis === 'primary' ? (
        <span className="ease-spring size-1.5 shrink-0 rounded-full bg-[var(--color-brand)] transition-transform duration-500 group-hover:scale-150" />
      ) : null}
      <span className="relative">
        {children}
        <span
          aria-hidden
          className={`ease-out-soft absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${
            emphasis === 'primary' ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-ink-muted)]'
          }`}
        />
      </span>
    </button>
  )
}


// A dot, a number, a quiet total. The dot pulses because the session is running, which is the
// only thing on the screen that is true continuously rather than at a step.
export function StepCount({ step, total }: { step: number; total: number }) {
  return (
    <p className="flex flex-col items-end">
      <span className="flex items-center gap-2">
        <span className="animate-pulse-dot size-1.5 rounded-full bg-[var(--color-brand)]" />
        <span className="nums text-lg leading-none font-semibold tracking-tight">{step}</span>
      </span>
      <span className="nums text-2xs text-[var(--color-ink-muted)]">/{total}</span>
    </p>
  )
}

// The three numbers a session has, where the answer was while it still mattered. Tabular, so
// none of them moves the others when it changes, and only the missed one is allowed a colour,
// and only once there is one to name.
export function SessionTally({
  done,
  left,
  missed,
  copy,
}: {
  done: number
  left: number
  missed: number
  copy: { readonly done: string; readonly left: string; readonly missed: string }
}) {
  const cells = [
    { key: 'done', value: done, label: copy.done, ink: '' },
    { key: 'left', value: left, label: copy.left, ink: '' },
    { key: 'missed', value: missed, label: copy.missed, ink: missed > 0 ? 'text-[var(--color-destructive)]' : '' },
  ]

  return (
    <div className="animate-drift flex items-end gap-4">
      {cells.map((cell) => (
        <span key={cell.key} className={`flex flex-col gap-0.5 ${cell.ink}`}>
          <span className="nums text-sm leading-none font-medium">{cell.value}</span>
          {/* Not the eyebrow treatment: at this size, bold small capitals with tracking read
              as loud as the number they qualify. Plain and lowercase, they stay under it. */}
          <span className="text-2xs leading-none text-[var(--color-ink-muted)]">{cell.label}</span>
        </span>
      ))}
    </div>
  )
}

// Three quantities on one hairline, which is where they belong: a corner holds one number
// well and three badly, and the counter above already says where the reader is. The width is
// the quantity and the colour says which, so there is no label, no legend and no digit. The
// destructive band exists only once something has been missed.
export function SessionRule({
  done,
  missed,
  total,
}: {
  done: number
  missed: number
  total: number
}) {
  const left = Math.max(total - done - missed, 0)

  return (
    <div aria-hidden className="-mx-6 flex h-0.5 shrink-0 overflow-hidden sm:-mx-8">
      <span
        className="ease-out-soft bg-[var(--color-ink-muted)] transition-all duration-700"
        style={{ flexGrow: done }}
      />
      <span
        className="ease-out-soft bg-[var(--color-destructive)] transition-all duration-700"
        style={{ flexGrow: missed }}
      />
      <span
        className="ease-out-soft bg-[var(--color-hairline)] transition-all duration-700"
        style={{ flexGrow: left }}
      />
    </div>
  )
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
            <span
              lang="ja"
              className={`ease-out-soft text-base leading-none whitespace-nowrap transition-all duration-500 ${
                at === index
                  ? 'font-medium text-[var(--color-ink)]'
                  : 'blur-hair font-light text-[var(--color-ink-muted)]/35'
              }`}
            >
              {entry.characters}
            </span>
            {/* The type's own colour rather than the accent: the dot under the active glyph
                answers the same question as the dot on the card, so it answers it the same
                way, and the vermillon stays reserved for what the reader can act on. */}
            <span
              className={`ease-spring size-1 rounded-full transition-all duration-500 ${TYPE_FILL[entry.type]} ${
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
