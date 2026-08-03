'use client'

import { SubjectBlock } from '@/ui/atoms/subject-block'
import type { Pattern } from '@/core/subject'

// What a list of meanings never teaches: which particle follows the word and what it takes.
// The pattern is set in Japanese at reading size, its gloss quiet underneath.
export function SubjectPatterns({
  patterns,
  label,
}: {
  patterns: readonly Pattern[]
  label: string
}) {
  if (patterns.length === 0) return null

  return (
    <SubjectBlock label={label}>
      <div className="flex flex-col gap-3 pt-1">
        {patterns.map((pattern) => (
          <span key={pattern.pattern} className="flex flex-col gap-0.5">
            <span lang="ja" className="text-base leading-snug">
              {pattern.pattern}
            </span>
            <span className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {pattern.gloss}
            </span>
          </span>
        ))}
      </div>
    </SubjectBlock>
  )
}
