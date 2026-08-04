import Link from 'next/link'

import { FLOWS } from '@/core/subject'
import type { Flow } from '@/core/subject'
import type { StartCopy } from '@/core/site-copy'
import { ScreenShell } from '@/ui/atoms/screen-shell'

// Where a session starts, and where the installed app opens: what is waiting, how much of it,
// and the one control that begins. It holds no deck and asks nothing, so it is the only screen
// here that is not a state of the loop.
//
// The rows are in the order the work is done in, a batch being taught before it is ever asked
// about, and each is a label, a value and a hairline rather than a button drawn in a box.

export function SessionStart({
  title,
  tagline,
  copy,
  queues,
}: {
  title: string
  tagline: string
  copy: StartCopy
  // What each flow has waiting and where it is entered. Keyed by the flow, so a flow the
  // product grows arrives with its count and its path or does not type-check.
  queues: Record<Flow, { count: number; href: string }>
}) {
  return (
    <ScreenShell>
      <header className="pt-safe flex flex-1 flex-col justify-end pb-12">
        <h1 className="animate-drift text-4xl leading-tight font-medium tracking-tight">{title}</h1>
        <p className="animate-drift mt-4 text-sm text-[var(--color-ink-muted)]">{tagline}</p>
      </header>

      <nav>
        <ul>
          {FLOWS.map((flow) => (
            <li key={flow} className="border-t border-[var(--color-hairline)]">
              <Queue label={copy.flow[flow]} queue={queues[flow]} />
            </li>
          ))}
        </ul>
      </nav>

      <p className="pb-safe eyebrow py-8 text-[var(--color-ink-muted)]">{copy.demo}</p>
    </ScreenShell>
  )
}

// A flow with nothing waiting is a row and not a control: the way in would land on an end the
// reader never reached. The row stays either way, because a flow that is empty today is the
// same flow tomorrow and a missing row reads as a feature that is gone.
function Queue({ label, queue }: { label: string; queue: { count: number; href: string } }) {
  const value = <span className="nums text-2xl tracking-tight">{queue.count}</span>

  if (queue.count === 0) {
    return (
      <p className="flex items-center justify-between py-6 text-[var(--color-ink-muted)]">
        <span className="text-2xl tracking-tight">{label}</span>
        {value}
      </p>
    )
  }

  return (
    <Link
      href={queue.href}
      className="ease-out-soft group flex items-center justify-between rounded-sm py-6 outline-none transition-colors duration-500 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-canvas)]"
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className="ease-out-soft size-1.5 rounded-full bg-[var(--color-brand)] transition-transform duration-500 group-hover:scale-150"
        />
        <span className="text-2xl tracking-tight">{label}</span>
      </span>
      {value}
    </Link>
  )
}
