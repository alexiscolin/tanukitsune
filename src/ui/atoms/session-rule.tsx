'use client'

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
  const whole = Math.max(total, 1)
  const passed = done / whole
  const wrong = missed / whole
  const rest = Math.max(1 - passed - wrong, 0)

  // Scaled and slid rather than grown. Three bands laid over each other at full width, each
  // transformed into its share: a transform runs on the compositor where a flex basis makes
  // the browser lay the row out again, and this is the one element that changes on every
  // card of the session. The translation is a share of the unscaled width, which is why it
  // reads as a position and not as a second scale.
  const band = (offset: number, scale: number) => ({
    transform: `translateX(${offset * 100}%) scaleX(${scale})`,
  })

  return (
    <div aria-hidden className="relative -mx-6 h-0.5 shrink-0 overflow-hidden sm:-mx-8">
      <span
        className="ease-out-soft absolute inset-0 origin-left bg-[var(--color-ink-muted)] transition-transform duration-700"
        style={band(0, passed)}
      />
      <span
        className="ease-out-soft absolute inset-0 origin-left bg-[var(--color-destructive)] transition-transform duration-700"
        style={band(passed, wrong)}
      />
      <span
        className="ease-out-soft absolute inset-0 origin-left bg-[var(--color-hairline)] transition-transform duration-700"
        style={band(passed + wrong, rest)}
      />
    </div>
  )
}
