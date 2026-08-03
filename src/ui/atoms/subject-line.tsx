'use client'

import { SubjectBlock } from '@/ui/atoms/subject-block'

export function Line({
  label,
  values,
  struck,
}: {
  label: string
  values: readonly string[]
  struck?: boolean
}) {
  if (values.length === 0) return null

  return (
    <SubjectBlock label={label}>
      {/* The rule through it says refused, and it says it alone: an opacity over the top would
          put the words under the contrast floor to repeat what the rule already carries. */}
      <p className={`text-sm ${struck === true ? 'line-through' : ''}`}>
        {values.join(', ')}
      </p>
    </SubjectBlock>
  )
}
