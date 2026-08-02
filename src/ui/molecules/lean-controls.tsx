'use client'

import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'

// The controls the onboarding sequence is made of, in the same language as the review
// screen. The rules are the ones the whole system holds to: no filled button, no outlined
// card, no radio circle, no chip. A selection is contrast and a single dot, a setting is a
// line of text, and a number is chosen by dragging a ruler under a fixed mark.
//
// None of these has a route yet. They are the vocabulary the sequence will be assembled
// from, and they are here to be looked at rather than reached.

// Pixels between two ticks of the ruler, which is what decides how far a finger travels per
// unit. Below about fourteen the value runs away from the hand.
const TICK_SPACING = 18

// The question block. Oversized, lines pulled tight, nothing around it.
export function Ask({ eyebrow, title, hint }: { eyebrow?: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {eyebrow === undefined ? null : (
        <span className="eyebrow text-[var(--color-brand)]">{eyebrow}</span>
      )}
      <h1 className="animate-drift max-w-xs text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>
      {hint === undefined ? null : (
        <p
          className="animate-drift max-w-sm text-sm leading-relaxed text-pretty text-[var(--color-ink-muted)]"
          style={{ animationDelay: '80ms' }}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

// Progress as one hairline with a vermillon segment, which is what a dot stepper is once the
// dashboard has been taken out of it. The numbers are padded so the pair never changes width.
export function StepRail({ step, total }: { step: number; total: number }) {
  const reached = Math.min(Math.max(step, 1), total) / total

  return (
    <div className="flex items-center gap-4">
      {/* Scaled rather than widened: a transform runs on the compositor and a width does
          not, and the segment is the only thing on the screen that moves at every step. */}
      <span className="relative block h-px flex-1 bg-[var(--color-hairline)]">
        <span
          className="ease-out-soft absolute inset-0 origin-left bg-[var(--color-brand)] transition-transform duration-700"
          style={{ transform: `scaleX(${reached})` }}
        />
      </span>
      <span className="nums eyebrow text-[var(--color-ink-muted)]">
        {String(step).padStart(2, '0')}
        <span className="opacity-40">/{String(total).padStart(2, '0')}</span>
      </span>
    </div>
  )
}

export type Choice = {
  readonly value: string
  readonly glyph?: string
  readonly label: string
  readonly meta?: string
}

// Selection without boxes. The character carries the meaning, the contrast carries the
// state, and one dot says which is chosen. A single tab stop with the arrows moving between
// options, because that is what a radio group owes a keyboard.
export function ChoiceRail({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly Choice[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  function move(by: 1 | -1) {
    const at = options.findIndex((option) => option.value === value)
    const next = options[(at + by + options.length) % options.length]
    if (next !== undefined) onChange(next.value)
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      {options.map((option, at) => {
        const chosen = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            tabIndex={chosen ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                event.preventDefault()
                move(1)
              }
              if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                event.preventDefault()
                move(-1)
              }
            }}
            style={{ animationDelay: `${at * 70}ms` }}
            className={`animate-drift ease-out-soft group flex items-baseline gap-5 py-5 text-left outline-none transition-opacity duration-500 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] ${
              chosen ? 'opacity-100' : 'opacity-35 hover:opacity-70'
            }`}
          >
            {option.glyph === undefined ? null : (
              <span
                lang="ja"
                aria-hidden
                className={`w-10 shrink-0 text-2xl leading-none font-light transition-colors duration-500 ${
                  chosen ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink)]'
                }`}
              >
                {option.glyph}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-2 text-base leading-tight font-medium">
                {option.label}
                <span
                  className={`ease-spring size-1.5 rounded-full bg-[var(--color-brand)] transition-all duration-500 ${
                    chosen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                  }`}
                />
              </span>
              {option.meta === undefined ? null : (
                <span className="nums text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  {option.meta}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Drag to choose a number. Ticks passing under a fixed mark, not a track with a knob: the
// value is read where the eye already is, and the ruler is what moves.
export function ScrubDial({
  value,
  onChange,
  min,
  max,
  unit,
  caption,
  label,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  unit?: string
  caption?: string
  label: string
}) {
  const from = useRef<{ x: number; start: number } | null>(null)
  const [active, setActive] = useState(false)

  const clamp = (raw: number) => Math.min(max, Math.max(min, Math.round(raw)))
  const ticks = Array.from({ length: max - min + 1 }, (_, at) => min + at)

  function down(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    from.current = { x: event.clientX, start: value }
    setActive(true)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (from.current === null) return
    const next = clamp(from.current.start - (event.clientX - from.current.x) / TICK_SPACING)
    if (next !== value) onChange(next)
  }

  function up() {
    from.current = null
    setActive(false)
  }

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div className="flex flex-col items-center gap-2">
        <span
          className={`nums text-6xl leading-none font-medium tracking-tighter transition-colors duration-300 ${
            active ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink)]'
          }`}
        >
          {value}
        </span>
        {unit === undefined ? null : (
          <span className="eyebrow text-[var(--color-ink-muted)]">{unit}</span>
        )}
        {caption === undefined ? null : (
          <p className="nums text-xs text-[var(--color-ink-muted)]">{caption}</p>
        )}
      </div>

      <div
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onChange(clamp(value + 1))
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') onChange(clamp(value - 1))
          if (event.key === 'Home') onChange(min)
          if (event.key === 'End') onChange(max)
        }}
        className="mask-fade-x relative h-14 w-full cursor-ew-resize touch-none overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-canvas)]"
      >
        <div
          className="ease-out-soft absolute top-0 left-1/2 flex h-full items-center transition-transform duration-200"
          style={{ transform: `translateX(${-(value - min) * TICK_SPACING}px)` }}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="flex shrink-0 items-center justify-center"
              style={{ inlineSize: TICK_SPACING }}
            >
              <span
                className={`ease-out-soft w-px rounded-full transition-all duration-300 ${
                  tick === value
                    ? 'h-9 bg-[var(--color-brand)]'
                    : tick % 5 === 0
                      ? 'h-5 bg-[var(--color-ink)]/25'
                      : 'h-2.5 bg-[var(--color-ink)]/10'
                }`}
              />
            </span>
          ))}
        </div>

        {/* The reading mark: fixed and centred, the value passes under it. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center"
        >
          <span className="size-1.5 translate-y-6 rounded-full bg-[var(--color-brand)]" />
        </span>
      </div>
    </div>
  )
}

// A setting is a line of text, not a card with a switch. The switch itself is two states of
// one dot on a hairline, and what says it is on is that the label stops being dimmed.
export function ToggleLine({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center gap-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`text-sm font-medium transition-opacity duration-500 ${
            checked ? 'opacity-100' : 'opacity-45 group-hover:opacity-75'
          }`}
        >
          {label}
        </span>
        {hint === undefined ? null : (
          <span className="text-xs text-[var(--color-ink-muted)]">{hint}</span>
        )}
      </span>

      <span aria-hidden className="relative flex h-4 w-9 shrink-0 items-center">
        <span className="absolute inset-x-0 h-px bg-[var(--color-hairline)]" />
        <span
          className={`ease-spring absolute left-0 size-2 rounded-full transition-all duration-500 ${
            checked
              ? 'translate-x-7 bg-[var(--color-brand)]'
              : 'translate-x-0 bg-[var(--color-ink-muted)]'
          }`}
        />
      </span>
    </button>
  )
}
