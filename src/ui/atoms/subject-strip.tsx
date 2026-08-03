'use client'

import { SubjectBlock } from '@/ui/atoms/subject-block'
import type { Component } from '@/core/subject'

// A composition is glyphs, not a list: the reader has to see the pieces to recognise them
// in the next character, and their meanings sit under them at label size.
export function SubjectStrip({ label, parts }: { label: string; parts: readonly Component[] }) {
  if (parts.length === 0) return null

  return (
    <SubjectBlock label={label}>
      <div className="flex flex-wrap gap-6 pt-1">
        {parts.map((part) => (
          <span key={part.id} className="flex flex-col items-center gap-1">
            <span lang="ja" className="text-2xl leading-none font-light">
              {part.characters}
            </span>
            <span className="eyebrow text-[var(--color-ink-muted)]">{part.meaning}</span>
          </span>
        ))}
      </div>
    </SubjectBlock>
  )
}
