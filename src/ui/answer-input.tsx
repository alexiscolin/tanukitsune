'use client'

import { useId, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { isJapanese, isKana, toKana } from 'wanakana'

import type { AnswerKind } from '@/core/answer-kind'
import { pressEnter } from '@/core/composition-gate'

const KANA_SYLLABLE = /[ぁ-ゖァ-ヶ]/u

// `isKana` accepts the middle dot and the prolonged sound mark, which the library names
// apart from kana itself, so a field holding nothing but punctuation would be graded and
// would cost an item its stage. A reading carries at least one syllable.
function isReading(answer: string): boolean {
  return isKana(answer) && KANA_SYLLABLE.test(answer)
}

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
  // the gate can tell which Enter confirmed it; this one says a Japanese editor owns the
  // text, and converting under it would rewrite what it is composing. Set from what is
  // being composed rather than from the event alone, because an Android keyboard composes
  // ordinary Latin typing too, and holding the field back through that would leave romaji
  // on screen for the very reader the conversion exists for.
  const composing = useRef(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value
    // Only while the caret sits at the end. Writing a converted string back to a field
    // drops the caret to the end of it, so converting a correction made mid-answer would
    // send the next keystroke somewhere the reader is not looking. What is edited in the
    // middle stays as typed and Enter finalises it.
    const atEnd = (event.target.selectionStart ?? typed.length) === typed.length
    // IME mode holds a trailing n as it is, because kana and kani are both still
    // possible and the next keystroke is what decides. Kana passes through unchanged,
    // so a reader who keeps a Japanese keyboard is not converted twice.
    const converted =
      kind === 'reading' && !composing.current && atEnd ? toKana(typed, { IMEMode: true }) : typed

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

    // Enter is the keystroke saying none follows, so the editor's held n is decided here
    // rather than left ambiguous: what it was waiting for cannot arrive any more.
    const answer = kind === 'reading' ? toKana(value) : value

    // What is left over after that cannot become kana at all: a pasted kanji, a digit, a
    // consonant cluster no vowel finished. Refusing it is what keeps a verdict off an
    // answer nobody meant to send, and it is not a wrong reading, so it is not graded.
    if (kind === 'reading' && !isReading(answer.trim())) {
      setRefused(true)
      return
    }

    // Otherwise as the reader left it. The field owns the conversion and the judge owns
    // what counts as a match, so normalising here would hand it an answer nobody typed.
    onSubmit(answer)
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
          composing.current = false
        }}
        onCompositionUpdate={(event) => {
          composing.current = isJapanese(event.data)
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
