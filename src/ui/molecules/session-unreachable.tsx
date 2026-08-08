import Link from 'next/link'

import type { ReviewCopy } from '@/core/site-copy'
import { ScreenShell } from '@/ui/atoms/screen-shell'

// The one state that is not a session: nothing answered and the device holds nothing for this
// flow. It is drawn like the end rather than like an error, because that is what it is from where
// the reader stands, and it leads out the same way: a screen with no way off it is a trap whatever
// its words say.
//
// It takes no focus. The end takes it because a step was left to reach it, and nothing was left to
// reach this.
export function SessionUnreachable({ copy, exitTo }: { copy: ReviewCopy; exitTo: string }) {
  return (
    <ScreenShell>
      <h1 className="animate-drift flex flex-1 items-center text-4xl leading-tight font-medium tracking-tight">
        {copy.unreachable}
      </h1>

      <Link
        href={exitTo}
        className="pb-safe group flex items-center gap-3 rounded-sm py-8 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-canvas)]"
      >
        <span
          aria-hidden
          className="ease-out-soft size-1.5 rounded-full bg-[var(--color-brand)] transition-transform duration-500 group-hover:scale-150"
        />
        <span className="text-base">{copy.back}</span>
      </Link>
    </ScreenShell>
  )
}
