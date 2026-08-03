'use client'

import type { SubjectCopy } from '@/core/site-copy'

// The single vermillon dot. It breathes while there is something to reveal, and becomes the
// pronunciation control on a subject that carries audio.
export function RevealDot({
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
