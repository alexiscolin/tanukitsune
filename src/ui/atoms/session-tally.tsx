'use client'

// The three numbers a session has, where the answer was while it still mattered. Tabular, so
// none of them moves the others when it changes, and only the missed one is allowed a colour,
// and only once there is one to name.
export function SessionTally({
  done,
  left,
  missed,
  copy,
}: {
  done: number
  left: number
  missed: number
  copy: { readonly done: string; readonly left: string; readonly missed: string }
}) {
  const cells = [
    { key: 'done', value: done, label: copy.done, ink: '' },
    { key: 'left', value: left, label: copy.left, ink: '' },
    { key: 'missed', value: missed, label: copy.missed, ink: missed > 0 ? 'text-[var(--color-destructive)]' : '' },
  ]

  return (
    <div className="animate-drift flex items-end gap-4">
      {cells.map((cell) => (
        <span key={cell.key} className={`flex flex-col gap-0.5 ${cell.ink}`}>
          <span className="nums text-sm leading-none font-medium">{cell.value}</span>
          {/* Not the eyebrow treatment: at this size, bold small capitals with tracking read
              as loud as the number they qualify. Plain and lowercase, they stay under it. */}
          <span className="text-2xs leading-none text-[var(--color-ink-muted)]">{cell.label}</span>
        </span>
      ))}
    </div>
  )
}
