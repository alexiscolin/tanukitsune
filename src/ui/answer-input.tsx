'use client'

import { useId, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { isKana, toKana } from 'wanakana'

import type { AnswerKind } from '@/core/answer-kind'
import { pressEnter } from '@/core/composition-gate'

export function AnswerInput({
  kind,
  label,
  unconverted,
  onSubmit,
}: {
  kind: AnswerKind
  label: string
  unconverted: string
  onSubmit: (raw: string) => void
}) {
  const fieldId = useId()
  const messageId = useId()
  const [value, setValue] = useState('')
  const [refused, setRefused] = useState(false)
  // A ref rather than state: the field renders identically either way, and the
  // end of a composition happens between two keystrokes of the typing loop.
  const compositionEndedAt = useRef<number | null>(null)
  // A second flag, and not the same question. The one above dates a composition so
  // the gate can tell which Enter confirmed it; this one says the editor still owns
  // the text, and converting under it would rewrite what it is composing.
  const composing = useRef(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value
    // IME mode holds a trailing n as it is, because kana and kani are both still
    // possible and the next keystroke is what decides. Kana passes through unchanged,
    // so a reader who keeps a Japanese keyboard is not converted twice.
    const converted = kind === 'reading' && !composing.current ? toKana(typed, { IMEMode: true }) : typed

    setValue(converted)
    setRefused(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // A keystroke the editor is still holding does not surface as Enter at all,
    // so this is also what keeps a keycode of 229 from ever reaching the gate.
    if (event.key !== 'Enter') return

    const press = pressEnter(
      { isComposing: event.nativeEvent.isComposing, pressedAt: event.nativeEvent.timeStamp },
      compositionEndedAt.current,
    )
    compositionEndedAt.current = press.compositionEndedAt
    if (!press.submits || value.trim() === '') return

    // A reading holding anything but kana is not an answer yet: the conversion never
    // finished, or the text was pasted. Refusing it is what keeps the judge from
    // grading a verdict on something nobody meant to send.
    if (kind === 'reading' && !isKana(value.trim())) {
      setRefused(true)
      return
    }

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
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => {
          composing.current = true
        }}
        onCompositionEnd={(event) => {
          composing.current = false
          compositionEndedAt.current = event.nativeEvent.timeStamp
        }}
        aria-invalid={refused || undefined}
        aria-describedby={refused ? messageId : undefined}
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
      {/* Announced rather than only associated: the refusal answers a key the reader
          has already pressed, so a message nobody hears is a submission that vanished. */}
      {refused ? (
        <p id={messageId} role="alert" className="text-sm text-[var(--color-ink)]">
          {unconverted}
        </p>
      ) : null}
    </div>
  )
}
