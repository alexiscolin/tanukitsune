'use client'

import { useState } from 'react'

import type { StartCopy } from '@/core/site-copy'

// Where a reader hands their WaniKani key over, and takes it back. It holds no knowledge of where the
// key goes: the screen above it does that, so this stays a field, a button and the three states a
// reader can be in.
//
// The field is a password field, so a key typed on a shared screen is not read over a shoulder and no
// browser offers to translate it. It is never filled back in once accepted: what the reader is shown
// afterwards is the account, which is the answer they wanted.

type Held = { readonly username: string; readonly level: number }

// The sentence with the account written into it. The locale decides where the name and the level fall,
// which is why they are named in the text rather than concatenated around it.
function said(sentence: string, held: Held): string {
  return sentence.replace('{username}', held.username).replace('{level}', String(held.level))
}

export function KeyForm({
  copy,
  held,
  submits,
  onKey,
  onForget,
  onSubmits,
  onErase,
}: {
  copy: StartCopy['key']
  // The account this browser holds a key for, or nothing.
  held: Held | null
  // Whether this reader's answers advance their WaniKani account.
  submits: boolean
  // Answers the account the key names, or null where the source refused it.
  onKey: (key: string) => Promise<Held | null>
  onForget: () => Promise<void>
  onSubmits: (submits: boolean) => Promise<void>
  // Answers how many rows were removed.
  onErase: () => Promise<number>
}) {
  const [key, setKey] = useState('')
  const [refused, setRefused] = useState(false)
  const [asking, setAsking] = useState(false)
  const [erased, setErased] = useState<number | null>(null)

  if (held !== null) {
    return (
      <div className="flex flex-col gap-4 py-8 text-sm">
        <p className="flex items-center justify-between gap-4">
          <span>{said(copy.signedIn, held)}</span>
          <button type="button" className="underline underline-offset-4" onClick={() => void onForget()}>
            {copy.signOut}
          </button>
        </p>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={submits}
            onChange={(event) => void onSubmits(event.target.checked)}
          />
          <span>{copy.submits}</span>
        </label>

        <p className="flex items-center justify-between gap-4">
          <button
            type="button"
            className="underline underline-offset-4 text-[var(--color-destructive)]"
            onClick={() => void onErase().then(setErased)}
          >
            {copy.forget}
          </button>
          <span role="status" className="text-xs text-[var(--color-ink-muted)]">
            {erased === null ? '' : copy.forgotten.replace('{removed}', String(erased))}
          </span>
        </p>
      </div>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (asking || key.trim() === '') return

    setAsking(true)
    const answered = await onKey(key.trim())
    setAsking(false)
    setRefused(answered === null)
    if (answered !== null) setKey('')
  }

  return (
    <form className="flex flex-col gap-3 py-8" onSubmit={(event) => void submit(event)}>
      <label className="eyebrow text-[var(--color-ink-muted)]" htmlFor="wanikani-key">
        {copy.label}
      </label>
      <input
        id="wanikani-key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        className="border-b border-[var(--color-hairline)] bg-transparent py-2 text-sm"
        value={key}
        onChange={(event) => {
          setKey(event.target.value)
          setRefused(false)
        }}
      />
      <p className="text-xs text-[var(--color-ink-muted)]">{copy.help}</p>
      <button type="submit" className="self-start underline underline-offset-4 text-sm" disabled={asking}>
        {copy.submit}
      </button>
      {/* Mounted whether or not it holds anything, because a polite region has to be in the document
          before its content changes. */}
      <p role="status" className="text-xs text-[var(--color-destructive)]">
        {refused ? copy.refused : ''}
      </p>
    </form>
  )
}
