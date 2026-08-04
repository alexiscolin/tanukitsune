'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

import type { ReviewCopy } from '@/core/site-copy'
import { ScreenShell } from '@/ui/atoms/screen-shell'

// The end is a step of the loop like every other, so it takes the focus the same way, and only
// once a step has been left: a deck that arrives empty was never a session, and taking the focus
// as the page loads is what the field's own rule refuses.
//
// It is also the only step that leads out, which is why the way back sits here rather than in
// each flow: leaving is the same act whether the session taught or asked.
export function SessionDone({
  copy,
  reached,
  exitTo,
}: {
  // The session's own words rather than two strings, so the end and the way out of it cannot
  // be handed a pair that does not go together.
  copy: ReviewCopy
  reached: boolean
  // Where the way out leads, which is the screen the session was started from. The route knows
  // the locale and no screen here does, so the path arrives rather than being built.
  exitTo: string
}) {
  const end = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (reached) end.current?.focus()
  }, [reached])

  return (
    <ScreenShell>
      <h1
        ref={end}
        tabIndex={-1}
        className="animate-drift flex flex-1 items-center text-4xl leading-tight font-medium tracking-tight outline-none"
      >
        {copy.done}
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
