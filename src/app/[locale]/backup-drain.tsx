'use client'

import { useEffect } from 'react'

import type { AnswerRecord } from '@/core/review/answer-record'
import { drain } from '@/core/review/drain'
import { BACKUP_PATH, BACKUP_SECRET_HEADER } from '@/core/routes'
import { localOutbox } from '@/data/local/outbox'

// The single flusher docs/framing.md asks for. Two tabs share one IndexedDB, so without the lock
// both would read the same queue and post it. The second post appends no row, the identifier
// coming from the device, but the request is made and the reader pays for it either way.
const LEADER = 'tanukitsune-backup-drain'

// Where the queue meets the network. It renders nothing and exists to hold the listeners, and it
// is a client component because the store, the events and the lock are all the browser's.
//
// It drains on mount and on the two returns docs/framing.md names, the network coming back and the
// tab coming back. Mount is what covers a reader who answered offline, closed the tab, and opened
// the application again with the network already restored: neither event fires on that path, and
// their queue would sit there until they happened to switch away and back.
//
// The secret arrives as a prop because only the server can read it. Rendering this component at
// all is what says a backup is configured, so there is one branch and it is at the wiring.
export function BackupDrain({ secret }: { secret: string }) {
  useEffect(() => {
    const backup = async (batch: readonly AnswerRecord[]) => {
      const stored = await fetch(BACKUP_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [BACKUP_SECRET_HEADER]: secret },
        body: JSON.stringify(batch),
      }).catch(() => null)

      return stored !== null && stored.ok
    }

    // The lock is held across the whole drain, and a tab that cannot take it waits rather than
    // giving up: by the time it runs, the leader has removed what it sent, so the follower reads
    // an empty queue and sends nothing. That is the same outcome as skipping, and it needs no
    // second rule for what a tab does when it loses.
    const run = () => {
      void navigator.locks
        .request(LEADER, () => drain(localOutbox, backup))
        // A drain that threw is a queue that kept its rows, which is what this design asks for on
        // every other failure too. There is nothing to report and nothing to undo.
        .catch(() => undefined)
    }

    const onReturn = () => {
      if (document.visibilityState === 'visible') run()
    }

    run()
    window.addEventListener('online', run)
    document.addEventListener('visibilitychange', onReturn)

    return () => {
      window.removeEventListener('online', run)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [secret])

  return null
}
