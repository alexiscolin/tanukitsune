'use client'

import { SubjectBlock } from '@/ui/atoms/subject-block'

export function Prose({ label, text }: { label: string; text: string | null }) {
  if (text === null) return null

  return (
    <SubjectBlock label={label}>
      <p className="text-sm leading-relaxed text-pretty">{text}</p>
    </SubjectBlock>
  )
}
