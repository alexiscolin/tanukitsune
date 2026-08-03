'use client'

import { useId, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { isJapanese, isKana, toKana } from 'wanakana'

import type { AnswerKind } from '@/core/answer-kind'
import { pressEnter } from '@/core/composition-gate'

// There is no field to see: a rule, centred under the character, and the answer appearing on
// it as it is typed. The rule is the brand at rest and the destructive colour when an answer
// cannot be graded at all.
//
// One word is set under it, and it is the only word on the screen: a character alone does
// not say whether it is its meaning or its reading that is being asked, and the answer to
// the wrong question is wrong for a reason the reader cannot see. It is a real label rather
// than a description, so pressing it reaches the field.

const KANA_SYLLABLE = /[ぁ-ゖァ-ヶ]/u

function isReading(answer: string): boolean {
  const composed = answer.normalize('NFKC')

  return isKana(composed) && KANA_SYLLABLE.test(composed)
}

function convertReading(buffer: string, next: string, shown: string, atEnd: boolean) {
  const grown = atEnd && next.startsWith(shown) ? buffer + next.slice(shown.length) : next

  return { buffer: grown, value: atEnd ? toKana(grown) : next }
}

// Two states and no third. An answer that stood is not shown here at all, because the field
// leaves with it, so every answer still on the screen once it has been judged is one that did
// not stand, whether a tier refused it or no tier could place it. The reader still rules on
// which of the two it was, and that ruling is what gets recorded: this says what the machine
// found, not what the answer was worth.
//
// Struck as well as coloured, because a verdict carried by hue alone is one a reader who
// cannot separate those hues never receives, and the accessibility gate this project runs
// refuses exactly that.
const STOOD_INK = 'text-[var(--color-ink)]'
const FELL_INK = 'text-[var(--color-destructive)] line-through decoration-2'
const STOOD_RULE = 'bg-[var(--color-brand)]'
const FELL_RULE = 'bg-[var(--color-destructive)]'

// Which of the two questions this is, and the only word on the screen. Under the rule rather
// than over it, so the eye meets the character, then the empty line it has to fill, then what
// to fill it with.
//
// It goes once the answer has been judged: the question stops being asked at that moment and
// the sheet below now says what was wanted. Only its ink leaves, because the field still owes
// a screen reader its name.
function Asked({ htmlFor, label, judged }: { htmlFor: string; label: string; judged: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className={
        judged ? 'sr-only' : 'eyebrow cursor-pointer text-[var(--color-brand)]'
      }
    >
      {label}
    </label>
  )
}

type AnswerFieldProps = {
  kind: AnswerKind
  label: string
  unconverted: string
  autoFocus: boolean
  // Whether anything has been said about what is in the field. The field is not replaced by
  // that judgement: an answer the reader wants to look at again, or correct, has to still be
  // there to be looked at.
  judged: boolean
  onSubmit: (raw: string) => void
  // Typing after a verdict withdraws it, because the judgement was about other text.
  onEdit: () => void
}

export function AnswerField({
  kind,
  label,
  unconverted,
  autoFocus,
  judged,
  onSubmit,
  onEdit,
}: AnswerFieldProps) {
  const fieldId = useId()
  const messageId = useId()
  const [value, setValue] = useState('')
  const [refusals, setRefusals] = useState(0)
  const typed = useRef('')
  const compositionEndedAt = useRef<number | null>(null)
  const composing = useRef(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value
    const atEnd = (event.target.selectionStart ?? next.length) === next.length
    const converted =
      kind === 'reading' && !composing.current
        ? convertReading(typed.current, next, value, atEnd)
        : { buffer: next, value: next }

    typed.current = converted.buffer
    setValue(converted.value)
    setRefusals(0)
    if (judged) onEdit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return

    const press = pressEnter(
      { isComposing: event.nativeEvent.isComposing, pressedAt: event.nativeEvent.timeStamp },
      compositionEndedAt.current,
    )
    compositionEndedAt.current = press.compositionEndedAt
    if (!press.submits || value.trim() === '') return
    event.preventDefault()

    const answer = kind === 'reading' ? toKana(typed.current) : value

    if (kind === 'reading' && !isReading(answer.trim())) {
      setRefusals(refusals + 1)
      return
    }

    onSubmit(answer)
  }

  const refused = refusals > 0
  const fell = judged || refused

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-56">
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionUpdate={(event) => {
            composing.current = isJapanese(event.data)
          }}
          onCompositionEnd={(event) => {
            composing.current = false
            compositionEndedAt.current = event.nativeEvent.timeStamp
          }}
          autoFocus={autoFocus}
          aria-invalid={refused || undefined}
          aria-describedby={refused ? messageId : undefined}
          lang={kind === 'reading' ? 'ja' : undefined}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`ease-out-soft w-full bg-transparent pb-2 text-center text-2xl leading-snug font-medium tracking-tight transition-colors duration-500 outline-none ${fell ? FELL_INK : STOOD_INK}`}
        />

        {/* The rule is the field. It is the only thing drawn, it never changes width, and
            the caret sits on it whether or not anything has been typed. */}
        <span
          aria-hidden
          className={`ease-out-soft absolute -bottom-px left-0 h-px w-full transition-colors duration-500 ${fell ? FELL_RULE : STOOD_RULE}`}
        />
      </div>

      <Asked htmlFor={fieldId} label={label} judged={judged} />

      {refused ? (
        <p
          key={refusals}
          id={messageId}
          role="alert"
          className="animate-drift max-w-56 text-center text-xs leading-relaxed text-[var(--color-destructive)]"
        >
          {unconverted}
        </p>
      ) : null}
    </div>
  )
}
