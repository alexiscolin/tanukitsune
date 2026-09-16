'use client'

import { useEffect, useState } from 'react'

import { KEY_PATH } from '@/core/routes'

// Which account this browser holds a key for, asked for rather than rendered into the document. The
// page is one shell for every reader of a deployment, and a document naming an account is one the
// service worker would keep on disk for whoever opens this browser next.
//
// Nothing here is trusted by the server: what it answers is what the signed cookie already said, and
// every write checks that cookie again. This is what a screen says, not what a row is written under.
export type Account = {
  // Whether the answer has arrived. A screen showing "no account" before anybody asked would offer the
  // key form to a reader who already handed one over.
  readonly asked: boolean
  readonly held: { username: string; level: number } | null
  readonly submits: boolean
}

const ASK_TIMEOUT = 10_000

export function useAccount(): Account {
  const [account, setAccount] = useState<Account>({ asked: false, held: null, submits: true })

  useEffect(() => {
    // A screen left before the answer arrives must not be written to, and the answer that is on its way
    // is the one this run asked for.
    let wanted = true

    const ask = async (): Promise<void> => {
      const answered = await fetch(KEY_PATH, { signal: AbortSignal.timeout(ASK_TIMEOUT) }).catch(() => null)
      const read =
        answered === null || !answered.ok
          ? { held: null }
          : ((await answered.json()) as { held: Account['held']; submits?: boolean })

      if (wanted) setAccount({ asked: true, held: read.held, submits: read.submits ?? true })
    }

    void ask()

    return () => {
      wanted = false
    }
  }, [])

  return account
}
