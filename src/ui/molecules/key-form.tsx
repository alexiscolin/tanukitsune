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
  onKey,
  onForget,
}: {
  copy: StartCopy['key']
  // The account this browser holds a key for, or nothing.
  held: Held | null
  // Answers the account the key names, or null where the source refused it.
  onKey: (key: string) => Promise<Held | null>
  onForget: () => Promise<void>
}) {
  const [key, setKey] = useState('')
  const [refused, setRefused] = useState(false)
  const [asking, setAsking] = useState(false)

  if (held !== null) {
    return (
      <p className="flex items-center justify-between gap-4 py-8 text-sm">
        <span>{said(copy.signedIn, held)}</span>
        <button type="button" className="underline underline-offset-4" onClick={() => void onForget()}>
          {copy.signOut}
        </button>
      </p>
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
