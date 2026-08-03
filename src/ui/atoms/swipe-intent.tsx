'use client'

// Readable well before it commits, so the reader can still change their mind.
const INTENT = 24

// The two verdicts sit behind the card and surface as it is pulled toward one, so the reader
// reads what they are about to say before they commit to saying it.
export function SwipeIntent({
  left,
  right,
  pull,
  reached,
}: {
  left: string
  right: string
  pull: number
  reached: number
}) {
  const toward = pull > INTENT ? 'right' : pull < -INTENT ? 'left' : null

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1">
      <span
        className="eyebrow text-[var(--color-ink-muted)] transition-opacity duration-200"
        style={{ opacity: toward === 'left' ? reached : 0 }}
      >
        {left}
      </span>
      <span
        className="eyebrow text-[var(--color-brand)] transition-opacity duration-200"
        style={{ opacity: toward === 'right' ? reached : 0 }}
      >
        {right}
      </span>
    </div>
  )
}
