'use client'

import type { ReactNode } from 'react'

import { AnswerField } from '@/ui/molecules/answer-field'
import { SubjectCard } from '@/ui/molecules/subject-card'
import type { Question } from '@/core/demo-deck'
import type { Verdict } from '@/core/grading/judge-port'
import type { ReviewCopy, SubjectCopy } from '@/core/site-copy'

// The card as a question: the field under the character until something has been said about
// it, and gone once it was right, because there is then nothing left to compare it against
// and the answer standing alone under the character is the whole point of the card opening.
export function QuestionCard({
  question,
  copy,
  subjectCopy,
  answered,
  decided,
  foot,
  onReveal,
  onSubmit,
  onEdit,
}: {
  question: Question
  copy: ReviewCopy
  subjectCopy: SubjectCopy
  answered: boolean
  decided: Verdict | null
  foot?: ReactNode
  onReveal: () => void
  onSubmit: (raw: string) => void
  onEdit: () => void
}) {
  return (
    <SubjectCard
      subject={question.subject}
      copy={subjectCopy}
      flow="review"
      revealed={answered}
      asked={question.kind}
      onReveal={onReveal}
      foot={foot}
      answer={
        answered && decided === 'correct' ? null : (
          <AnswerField
            key={`${question.subject.id}-${question.kind}`}
            kind={question.kind}
            label={copy.prompt[question.kind]}
            unconverted={copy.unconverted}
            // Every card, the first included. The field is remounted per question, so this
            // fires on each one and the keyboard never has to be summoned.
            autoFocus
            judged={answered}
            onSubmit={onSubmit}
            onEdit={onEdit}
          />
        )
      }
    />
  )
}
