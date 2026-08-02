'use client'

import type { Band } from '@/core/subject'

// The three figures the progression screen is made of. Two of them are volumes and one is a
// list, and none of them is a chart: what they show is one quantity against its whole, which
// a filled shape says without an axis, a legend or a grid.
//
// None of these has a route yet.

const ORB_SIZE = {
  sm: 'size-28',
  md: 'size-44',
  lg: 'size-64',
} as const

// The signature figure: a disc filling like a liquid. Clipped from the top rather than drawn
// as a ring, because a waterline is read instantly and an arc has to be estimated.
export function ProgressOrb({
  value,
  max,
  size = 'md',
  label,
  caption,
}: {
  value: number
  max: number
  size?: keyof typeof ORB_SIZE
  label: string
  caption?: string
}) {
  const filled = Math.min(Math.max(value / max, 0), 1)

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative isolate flex items-center justify-center ${ORB_SIZE[size]}`}
    >
      {/* Light thrown by the volume itself, held inside its own footprint: a wider blur reads
          as decoration, which this system has none of. */}
      <span
        aria-hidden
        className="absolute -inset-2 -z-10 rounded-full bg-[var(--color-brand-soft)] blur-xl"
        style={{ opacity: 0.28 + filled * 0.3 }}
      />
      <span aria-hidden className="absolute inset-0 rounded-full bg-[var(--color-brand-soft)]" />
      <span
        aria-hidden
        className="bg-sunrise-gradient absolute inset-0 rounded-full"
        style={{
          clipPath: `inset(${(1 - filled) * 100}% 0 0 0)`,
          transition: 'clip-path 1s var(--ease-out-soft)',
        }}
      />
      {/* The waterline, which is the only edge in the figure and the one the eye reads. */}
      <span
        aria-hidden
        className="absolute inset-x-0 h-px bg-[var(--color-success-foreground)]/45"
        style={{ top: `${(1 - filled) * 100}%` }}
      />

      <span className="relative flex flex-col items-center gap-0.5 text-[var(--color-success-foreground)]">
        <span className="nums text-2xl leading-none font-bold">{value}</span>
        {caption === undefined ? null : <span className="eyebrow opacity-80">{caption}</span>}
      </span>
    </div>
  )
}

// The compact one, for a figure that sits beside something rather than being the screen. A
// ring rather than a disc, because at this size a waterline is two pixels of difference.
export function RadialProgress({
  value,
  max,
  label,
  children,
}: {
  value: number
  max: number
  label: string
  children?: React.ReactNode
}) {
  const filled = Math.min(Math.max(value / max, 0), 1)
  const radius = 30
  const circumference = 2 * Math.PI * radius

  return (
    <div role="img" aria-label={label} className="relative grid size-18 place-items-center">
      <svg aria-hidden viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-[var(--color-hairline)]"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-[var(--color-brand)]"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference * (1 - filled),
            transition: 'stroke-dashoffset 1s var(--ease-out-soft)',
          }}
        />
      </svg>
      <span className="nums relative text-sm leading-none font-medium">{children}</span>
    </div>
  )
}

const BAND_INK: Record<Band, string> = {
  lesson: 'bg-[var(--color-srs-lesson)]',
  apprentice: 'bg-[var(--color-srs-apprentice)]',
  guru: 'bg-[var(--color-srs-guru)]',
  master: 'bg-[var(--color-srs-master)]',
  enlightened: 'bg-[var(--color-srs-enlightened)]',
  burned: 'bg-[var(--color-srs-burned)]',
}

export type Segment = {
  readonly band: Band
  readonly glyph: string
  readonly label: string
  readonly count: number
}

// The mastery ladder as a list of rules rather than a stacked bar: each rung is a row, its
// rule is as long as its share of the whole, and its colour is where that rung sits on the
// ramp. A stacked bar would put six colours in one line and make the small ones unreadable.
export function SegmentBar({ segments }: { segments: readonly Segment[] }) {
  const whole = segments.reduce((sum, segment) => sum + segment.count, 0)

  return (
    <div className="flex flex-col">
      {segments.map((segment) => (
        <div key={segment.band} className="flex flex-col gap-2 py-4">
          <div className="flex items-baseline gap-4">
            <span lang="ja" className="w-10 shrink-0 text-sm text-[var(--color-ink-muted)]/60">
              {segment.glyph}
            </span>
            <span className="flex-1 text-base font-medium">{segment.label}</span>
            <span className="nums text-base">{segment.count}</span>
          </div>
          <span className="relative block h-px w-full bg-[var(--color-hairline)]">
            <span
              className={`ease-out-soft absolute inset-y-0 left-0 origin-left transition-transform duration-700 ${BAND_INK[segment.band]}`}
              style={{ width: '100%', transform: `scaleX(${whole === 0 ? 0 : segment.count / whole})` }}
            />
          </span>
        </div>
      ))}
    </div>
  )
}
