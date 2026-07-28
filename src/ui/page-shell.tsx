import type { ReactNode } from 'react'

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-prose flex-col justify-center gap-4 p-6">
      {children}
    </main>
  )
}
