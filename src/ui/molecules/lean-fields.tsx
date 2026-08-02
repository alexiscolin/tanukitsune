'use client'

import { useId, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import { Eyebrow } from '@/ui/atoms/session-chrome'

// The fields the signup sequence is made of, in the same language as everything else: no box
// around anything, one rule under the text, and the rule is inked from the left the moment
// the field carries an answer. What differs between them is what the rule has to say.
//
// None of these has a route yet. They are the vocabulary that sequence will be assembled
// from, and they are here to be looked at rather than reached.

// The rule, the label over it and the message under it. Every field below wears this, so a
// form is one rhythm however many kinds of answer it asks for.
function FieldLine({
  label,
  htmlFor,
  hint,
  error,
  focused,
  filled,
  counter,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  focused: boolean
  filled: boolean
  counter?: ReactNode
  children: ReactNode
}) {
  const invalid = error !== undefined

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={htmlFor} className="cursor-pointer">
          <Eyebrow tone={focused || invalid ? 'brand' : 'muted'}>{label}</Eyebrow>
        </label>
        {counter}
      </div>

      <div className="relative">
        {children}
        <span aria-hidden className="absolute -bottom-px left-0 h-px w-full bg-[var(--color-hairline)]" />
        <span
          aria-hidden
          className={`ease-out-soft absolute -bottom-px left-0 h-px w-full origin-left transition-transform duration-500 ${
            invalid ? 'bg-[var(--color-destructive)]' : 'bg-[var(--color-brand)]'
          } ${focused || invalid || filled ? 'scale-x-100' : 'scale-x-0'}`}
        />
      </div>

      {error === undefined ? null : (
        <p role="alert" className="animate-drift text-xs text-[var(--color-destructive)]">
          {error}
        </p>
      )}
      {error === undefined && hint !== undefined ? (
        <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

export function LeanInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string
  type?: 'text' | 'email'
  autoComplete?: string
}) {
  const id = useId()
  const [focused, setFocused] = useState(false)

  return (
    <FieldLine
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      focused={focused}
      filled={value.length > 0}
    >
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error === undefined ? undefined : true}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent pb-3 text-3xl leading-snug font-medium tracking-tight outline-none placeholder:font-normal placeholder:text-[var(--color-ink-muted)]/35"
      />
    </FieldLine>
  )
}

// Four rungs, none of which is a rule anyone has to satisfy: the source of a weak password is
// its length, so length is what the first two count, and the last two only reward mixing.
function strengthOf(secret: string): number {
  let rungs = 0
  if (secret.length >= 8) rungs += 1
  if (secret.length >= 12) rungs += 1
  if (/[^a-zA-Z0-9]/.test(secret)) rungs += 1
  if (/\d/.test(secret) && /[a-zA-Z]/.test(secret)) rungs += 1

  return Math.min(rungs, 4)
}

export function SecretField({
  label,
  value,
  onChange,
  hint,
  error,
  reveal,
  hide,
  strength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
  reveal: string
  hide: string
  // One word per rung, indexed from zero, so a rung added to the ladder is a type error
  // rather than a bar with no name.
  strength: readonly [string, string, string, string, string]
}) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [shown, setShown] = useState(false)
  const rungs = strengthOf(value)

  return (
    <div className="flex flex-col gap-4">
      <FieldLine
        label={label}
        htmlFor={id}
        hint={hint}
        error={error}
        focused={focused}
        filled={value.length > 0}
        counter={
          value.length === 0 ? undefined : (
            <button
              type="button"
              onClick={() => setShown(!shown)}
              className="pressable eyebrow text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              {shown ? hide : reveal}
            </button>
          )
        }
      >
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          autoComplete="new-password"
          aria-invalid={error === undefined ? undefined : true}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full bg-transparent pb-3 font-medium outline-none ${
            shown ? 'text-3xl tracking-tight' : 'text-4xl tracking-widest'
          }`}
        />
      </FieldLine>

      {/* Four rules rather than a bar with a colour that changes: the ladder is countable at a
          glance, and the word beside it is what a reader who cannot count colour reads. */}
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3, 4].map((rung) => (
            <span
              key={rung}
              className={`ease-out-soft h-px flex-1 origin-left transition-all duration-500 ${
                rung <= rungs ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-hairline)]'
              }`}
            />
          ))}
        </div>
        <span
          aria-live="polite"
          className={`eyebrow transition-colors duration-500 ${
            rungs >= 3 ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          {strength[rungs]}
        </span>
      </div>
    </div>
  )
}

// A code is a row of rules, one per digit, each inked as it is filled. One field underneath
// carries the whole value, so paste, autofill and the keyboard all behave as they should.
export function CodeField({
  label,
  value,
  onChange,
  length,
  error,
  onComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  length: number
  error?: string
  onComplete?: (value: string) => void
}) {
  const id = useId()
  const [focused, setFocused] = useState(false)

  function set(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, length)
    onChange(digits)
    if (digits.length === length && onComplete !== undefined) onComplete(digits)
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="cursor-pointer">
        <Eyebrow tone={focused || error !== undefined ? 'brand' : 'muted'}>{label}</Eyebrow>
      </label>

      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          aria-invalid={error === undefined ? undefined : true}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => set(event.target.value)}
          className="absolute inset-0 w-full opacity-0"
        />
        <div aria-hidden className="flex gap-3">
          {Array.from({ length }, (_, at) => (
            <span key={at} className="flex flex-1 flex-col gap-2">
              <span className="nums text-center text-3xl leading-none font-medium">
                {value[at] ?? ' '}
              </span>
              <span
                className={`ease-out-soft h-px w-full transition-colors duration-500 ${
                  error !== undefined
                    ? 'bg-[var(--color-destructive)]'
                    : at < value.length
                      ? 'bg-[var(--color-brand)]'
                      : 'bg-[var(--color-hairline)]'
                }`}
              />
            </span>
          ))}
        </div>
      </div>

      {error === undefined ? null : (
        <p role="alert" className="animate-drift text-xs text-[var(--color-destructive)]">
          {error}
        </p>
      )}
    </div>
  )
}

// Consent is a line of text with a stroke beside it, never a square with a tick. The stroke
// draws itself from the left and a dot lands over it, which is the same gesture the rest of
// the interface uses to say that something now holds.
export function ConsentLine({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  children: ReactNode
}) {
  function toggle(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== ' ') return
    event.preventDefault()
    onChange(!checked)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-invalid={error === undefined ? undefined : true}
        onClick={() => onChange(!checked)}
        onKeyDown={toggle}
        className="group flex items-start gap-4 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-canvas)]"
      >
        <span aria-hidden className="relative mt-1.5 flex h-4 w-5 shrink-0 items-center">
          <span
            className={`absolute inset-x-0 h-px transition-colors duration-500 ${
              error === undefined ? 'bg-[var(--color-hairline)]' : 'bg-[var(--color-destructive)]'
            }`}
          />
          <span
            className={`ease-out-soft absolute inset-x-0 h-px origin-left bg-[var(--color-brand)] transition-transform duration-500 ${
              checked ? 'scale-x-100' : 'scale-x-0'
            }`}
          />
          <span
            className={`ease-spring absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--color-brand)] transition-all duration-500 ${
              checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
          />
        </span>
        <span
          className={`text-sm leading-relaxed text-pretty transition-opacity duration-500 ${
            checked ? 'opacity-100' : 'opacity-55 group-hover:opacity-80'
          }`}
        >
          {children}
        </span>
      </button>

      {error === undefined ? null : (
        <p role="alert" className="animate-drift pl-9 text-xs text-[var(--color-destructive)]">
          {error}
        </p>
      )}
    </div>
  )
}
