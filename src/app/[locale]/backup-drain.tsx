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

// What one send may take before the queue treats it as unreachable. A request has no deadline of
// its own, so a connection that opens and never answers would hold the lock for as long as the tab
// lives and stop that tab draining again. Generous rather than tight: this bounds a hang, and a
// slow network is not one.
const SEND_TIMEOUT = 30_000

// Where the queue meets the network. It renders nothing and exists to hold the listeners, and it
// is a client component because the store, the events and the lock are all the browser's.
//
// It drains on mount and on the two returns docs/framing.md names, the network coming back and the
// tab coming back. Mount is what covers a reader who answered offline, closed the tab, and opened
// the application again with the network already restored: neither event fires on that path, and
// their queue would sit there until they happened to switch away and back.
//
// The secret arrives as a prop because only the server can read it. Rendering this component at
// all is what says a backup is configured, so there is one branch and it is at the wiring, on a
// route rendered per request for the reasons given there.
export function BackupDrain({ secret }: { secret: string }) {
  useEffect(() => {
    const backup = async (batch: readonly AnswerRecord[]) => {
      const stored = await fetch(BACKUP_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [BACKUP_SECRET_HEADER]: secret },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(SEND_TIMEOUT),
      }).catch(() => null)

      return stored !== null && stored.ok
    }

    // A tab that cannot take the lock gives up rather than queueing behind the leader. Waiting
    // would be harmless once, but every reconnection and every return to the tab asks again, so a
    // slow send would leave a queue of drains that all run against what the leader already
    // emptied, or all repost the same batch to a server that just refused it.
    const run = () => {
      void navigator.locks
        .request(LEADER, { ifAvailable: true }, (lock) =>
          lock === null ? undefined : drain(localOutbox, backup),
        )
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
