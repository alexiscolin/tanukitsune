'use client'

import { useEffect } from 'react'

import { drain } from '@/core/review/drain'
import { SYNC_PATH } from '@/core/routes'
import { backupTo } from '@/data/local/backup'
import { flushTo } from '@/data/local/flush'
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
// because the two are one sequence and a second tab holding either would run half of it. What it
// sends is worked out on the server, so the trigger is the whole of what lives here.
//
// Rendering this component at all is what says a backup is configured, so there is one branch and it
// is at the wiring. It carries no secret: the browser holds one the page cannot read, set by the
// route the screen asks its sitting from.
export function BackupDrain() {
  useEffect(() => {
    const backup = backupTo()
    const flush = flushTo()
    // The right to post, asked for once and kept by the browser. Awaited before the first send
    // rather than raced with it: a queue carried over from a previous visit is drained the moment
    // this mounts, and a send that outran the cookie is one refusal the reader pays for.
    const allowed = fetch(SYNC_PATH).catch(() => undefined)

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

          await allowed
          await drain(localOutbox, backup)
          await flush()
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
  }, [])

  return null
}
