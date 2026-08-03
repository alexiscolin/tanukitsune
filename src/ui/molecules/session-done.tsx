'use client'

import { useEffect, useRef } from 'react'

import { ScreenShell } from '@/ui/atoms/screen-shell'

// The end is a step of the loop like every other, so it takes the focus the same way, and only
// once a step has been left: a deck that arrives empty was never a session, and taking the focus
// as the page loads is what the field's own rule refuses.
export function SessionDone({ label, reached }: { label: string; reached: boolean }) {
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
        {label}
      </h1>
    </ScreenShell>
  )
}
