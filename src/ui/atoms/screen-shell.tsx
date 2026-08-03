import type { ReactNode } from 'react'

// Every screen is full bleed and carries its own gutters. It replaces the prose measure
// docs/decisions/0010-behaviour-imported-appearance-written.md names as wrong for this
// interface: the screens are edge to edge, and a shell that centres inside a reading width
// fights every one of them.
export function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen-safe flex flex-col">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 sm:px-8">{children}</main>
    </div>
  )
}
