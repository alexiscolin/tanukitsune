'use client'

import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { AnswerKind } from '@/core/answer-kind'
import { enterSubmits } from '@/core/composition-gate'

export function AnswerInput({
  kind,
  label,
  onSubmit,
}: {
  kind: AnswerKind
  label: string
  onSubmit: (raw: string) => void
}) {
  const fieldId = useId()
  const [value, setValue] = useState('')
  // A ref rather than state: the field renders identically either way, and the
  // end of a composition happens between two keystrokes of the typing loop.
  const compositionEndedAt = useRef<number | null>(null)

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // A keystroke the editor is still holding does not surface as Enter at all,
    // so this is also what keeps a keycode of 229 from ever reaching the gate.
    if (event.key !== 'Enter') return

    const submits = enterSubmits({
      isComposing: event.nativeEvent.isComposing,
      pressedAt: event.nativeEvent.timeStamp,
      compositionEndedAt: compositionEndedAt.current,
    })
    // Cleared whichever way the gate decided: one confirmation swallows exactly
    // one Enter, which leaves the window to cover a conversion committed by a tap.
    compositionEndedAt.current = null
    if (!submits || value.trim() === '') return

    // Raw, because what counts as a match is the judge's decision and normalising
    // here would hand it an answer nobody typed.
    onSubmit(value)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm text-[var(--color-ink-muted)]">
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionEnd={(event) => {
          compositionEndedAt.current = event.nativeEvent.timeStamp
        }}
        // A reading is typed in Japanese; a meaning is typed in whichever language
        // the locale segment already declared on the document.
        lang={kind === 'reading' ? 'ja' : undefined}
        // The editor is the only thing allowed to change this field. A correction,
        // a capital or a suggestion from the browser rewrites the answer between
        // the keystroke and the verdict, which grades something nobody typed.
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="rounded-md border border-[var(--color-ink-muted)] bg-[var(--color-surface-raised)] px-3 py-2 text-lg text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
      />
    </div>
  )
}
