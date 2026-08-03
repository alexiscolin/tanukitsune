'use client'

import type { ReactNode } from 'react'

export function Eyebrow({
  children,
  tone = 'brand',
}: {
  children: ReactNode
  tone?: 'brand' | 'muted'
}) {
  return (
    <span
      className={`eyebrow transition-colors duration-500 ${tone === 'brand' ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink-muted)]'}`}
    >
      {children}
    </span>
  )
}
