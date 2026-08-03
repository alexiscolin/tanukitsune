'use client'

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
