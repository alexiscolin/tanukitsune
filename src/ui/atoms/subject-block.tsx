'use client'

import type { ReactNode } from 'react'

import { Eyebrow } from '@/ui/atoms/eyebrow'

// The leaf every other one is built on, and the whole of what keeps the card lean under load:
// one shape, a label in small capitals and its value under it, and the only line ever drawn is
// the hairline between two of them.
//
// Every block wears this, so the card is one rhythm however much it carries.
export function SubjectBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--color-hairline)] pt-5 first:border-0 first:pt-0">
      <Eyebrow>{label}</Eyebrow>
      {children}
    </div>
  )
}
