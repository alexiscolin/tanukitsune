'use client'

import { SubjectBlock } from '@/ui/atoms/subject-block'
import type { Sentence } from '@/core/subject'

export function SubjectSentences({
  sentences,
  label,
}: {
  sentences: readonly Sentence[]
  label: string
}) {
  if (sentences.length === 0) return null

  return (
    <SubjectBlock label={label}>
      <div className="flex flex-col gap-4 pt-1">
        {sentences.map((sentence, at) => (
          <span
            key={sentence.ja}
            className="animate-drift flex flex-col gap-1"
            style={{ animationDelay: `${120 + at * 90}ms` }}
          >
            <span lang="ja" className="text-sm leading-relaxed">
              {sentence.ja}
            </span>
            <span className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {sentence.gloss}
            </span>
          </span>
        ))}
      </div>
    </SubjectBlock>
  )
}
