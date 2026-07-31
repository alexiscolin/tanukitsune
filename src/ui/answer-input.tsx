'use client'

import { useId, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { isJapanese, isKana, toKana } from 'wanakana'

import type { AnswerKind } from '@/core/answer-kind'
import { pressEnter } from '@/core/composition-gate'

const KANA_SYLLABLE = /[ぁ-ゖァ-ヶ]/u

// `isKana` accepts the middle dot and the prolonged sound mark, which the library names
// apart from kana itself, so a field holding nothing but punctuation would be graded and
// would cost an item its stage. A reading carries at least one syllable. Composed first,
// because half-width kana is an answer the judge already folds and a message standing in
// front of it would describe a problem the reader does not have.
function isReading(answer: string): boolean {
  const composed = answer.normalize('NFKC')

  return isKana(composed) && KANA_SYLLABLE.test(composed)
}

// Pure, and the whole conversion rule, so the component only wires events to it.
//
// The buffer is what was typed, which the kana on screen cannot recover: a doubled n
// commits ん and the n that should have started the next syllable is gone from it, so
// tennou reads てんおう off the screen and てんのう off the buffer. It grows by what was
// appended at the end; a deletion, a correction or a paste makes the field itself the
// buffer again, since what it holds is then the only account of the answer that exists.
//
// The plain parse, not the library's editor mode: that mode holds a trailing n, and it
// also reads a doubled one as ん alone. Reparsing costs a lone n showing as ん one
// keystroke early, and it corrects itself when a vowel follows.
//
// Nothing is converted while the caret sits elsewhere, because writing a converted string
// back to a field drops the caret to the end of it, and a correction made mid-answer must
// not send the next keystroke where the reader is not looking. Enter finalises that.
function convertReading(buffer: string, next: string, shown: string, atEnd: boolean) {
  const grown = atEnd && next.startsWith(shown) ? buffer + next.slice(shown.length) : next

  return { buffer: grown, value: atEnd ? toKana(grown) : next }
}

// Two rules about the keystroke rather than about the text, because the field is one step
// of a loop and not a form on its own.
//
// The Enter it acted on is consumed. What replaces the field is focused as the answer
// leaves it, and the default action of that same keystroke would then press it, so one
// Enter would send the answer and dismiss the verdict it produced. Only the paths that act
// consume it, which leaves an editor the Enter it is confirming a conversion with.
//
// The field takes the focus as it mounts when it replaced another one, so the key that moved
// the session on lands in the answer to the next question. Without it the focus falls on
// nothing when the control that advanced leaves, and every question has to be clicked before
// it can be typed. The caller decides, because the first field of a session replaced nothing
// and taking the focus there reads the field out before the question it answers.
type AnswerInputProps = {
  kind: AnswerKind
  label: string
  unconverted: string
  autoFocus: boolean
  onSubmit: (raw: string) => void
}

export function AnswerInput({ kind, label, unconverted, autoFocus, onSubmit }: AnswerInputProps) {
  const fieldId = useId()
  const messageId = useId()
  const [value, setValue] = useState('')
  // Counted rather than flagged: a live region announces a change, so a refusal repeated
  // on the same text has to render a new node or the second Enter is silence.
  const [refusals, setRefusals] = useState(0)
  const typed = useRef('')
  // A ref rather than state: the field renders identically either way, and the
  // end of a composition happens between two keystrokes of the typing loop.
  const compositionEndedAt = useRef<number | null>(null)
  // Not the same question as the one above, which dates a composition for the gate: this
  // one says a Japanese editor owns the text, and converting under it would rewrite it.
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
    event.preventDefault()

    // From the buffer, and Enter is the keystroke saying no other follows, so what a
    // correction left in the middle is decided here rather than sent as it stands.
    const answer = kind === 'reading' ? toKana(typed.current) : value

    // What is left over after that cannot become kana at all: a pasted kanji, a digit, a
    // consonant cluster no vowel finished. Refusing it is what keeps a verdict off an
    // answer nobody meant to send, and it is not a wrong reading, so it is not graded.
    if (kind === 'reading' && !isReading(answer.trim())) {
      setRefusals(refusals + 1)
      return
    }

    // Otherwise as the reader left it. The field owns the conversion and the judge owns
    // what counts as a match, so normalising here would hand it an answer nobody typed.
    onSubmit(answer)
    setValue('')
    typed.current = ''
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
        onCompositionUpdate={(event) => {
          // Only ever released, never taken: an editor owns the text from the moment it
          // starts, and the engines disagree on whether an update precedes the change it
          // causes. What releases it is a preedit that is not Japanese, which is an
          // Android keyboard composing ordinary Latin typing.
          composing.current = isJapanese(event.data)
        }}
        onCompositionEnd={(event) => {
          composing.current = false
          compositionEndedAt.current = event.nativeEvent.timeStamp
        }}
        autoFocus={autoFocus}
        aria-invalid={refusals > 0 || undefined}
        aria-describedby={refusals > 0 ? messageId : undefined}
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
      {refusals > 0 ? (
        <p key={refusals} id={messageId} role="alert" className="text-sm text-[var(--color-ink)]">
          {unconverted}
        </p>
      ) : null}
    </div>
  )
}
