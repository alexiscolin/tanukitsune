'use client'

// Three hairlines of unequal width. A mark rather than a control: nothing opens yet, and a
// button that does nothing is a placeholder in the diff and a lie in the accessibility
// tree. It becomes a button on the day there is a menu behind it.
export function MenuMark() {
  return (
    <span aria-hidden className="group flex flex-col gap-1 py-2">
      <span className="ease-out-soft h-px w-6 bg-[var(--color-ink)]/70 transition-all duration-500 group-hover:w-4" />
      <span className="ease-out-soft h-px w-4 bg-[var(--color-ink)]/70 transition-all duration-500 group-hover:w-6" />
      <span className="ease-out-soft h-px w-5 bg-[var(--color-ink)]/70 transition-all duration-500 group-hover:w-3" />
    </span>
  )
}
