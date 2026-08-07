'use client'

import { useEffect } from 'react'

import { drain } from '@/core/review/drain'
import { flush } from '@/core/review/flush'
import { backupTo } from '@/data/local/backup'
import { pendingAt, sendTo } from '@/data/local/flush'
import { localOutbox } from '@/data/local/outbox'

// The single flusher docs/framing.md asks for. Two tabs share one IndexedDB, so without the lock
// both would read the same queue and post it. The second post appends no row, the identifier
// coming from the device, but the request is made and the reader pays for it either way.
const LEADER = 'tanukitsune-backup-drain'

// What starts the drain. It renders nothing and exists to hold the listeners, and it is a client
// component because the store, the events and the lock are all the browser's.
//
// The three triggers are the ones docs/framing.md names: the page coming up, the network coming
// back, and the tab coming back.
//
// The flush follows the drain under the same lock, and in that order: it reads the backed-up rows,
// so an answer still on the device has nothing waiting for it upstream. One lock rather than two,
// because the two are one sequence and a second tab holding either would run half of it.
//
// The secret arrives as a prop because only the server can read it. Rendering this component at all
// is what says a backup is configured, so there is one branch and it is at the wiring, on a route
// rendered per request for the reasons given there.
export function BackupDrain({ secret }: { secret: string }) {
  useEffect(() => {
    const backup = backupTo(secret)

    // A tab that cannot take the lock gives up rather than queueing behind the leader. Waiting
    // would be harmless once, but every reconnection and every return to the tab asks again, so a
    // slow send would leave a queue of drains that all run against what the leader already emptied,
    // or all repost the same batch to a server that just refused it.
    //
    // Nothing is attempted with no network. The queue would keep its rows either way, so what this
    // saves is the read and the doomed request; the reader is on a train for the length of a
    // session, and every return to the tab in that time would otherwise make both.
    const run = () => {
      if (!navigator.onLine) return

      void navigator.locks
        .request(LEADER, { ifAvailable: true }, async (lock) => {
          if (lock === null) return

          await drain(localOutbox, backup)
          await flush(pendingAt(secret), sendTo(secret))
        })
        // A drain or a flush that threw leaves its rows where they were, which is what this design
        // asks for on every other failure too. There is nothing to report and nothing to undo.
        .catch(() => undefined)
    }

    run()
    window.addEventListener('online', run)
    // Both directions of the change, and the tab leaving is the one that matters. A reader who was
    // online throughout meets no other trigger after the page came up: they answer a whole session
    // against a queue nothing has looked at since it was empty, and closing the tab is the first
    // event since. Coming back is covered because the same listener sees it.
    document.addEventListener('visibilitychange', run)

    return () => {
      window.removeEventListener('online', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [secret])

  return null
}
