'use client'

import { useEffect } from 'react'

// What registers the service worker, and the only thing that does. It renders nothing and is a
// client component because a worker is the browser's.
//
// A worker that took over mid-session would change the screen under a reader who was answering, so
// a waiting one is told to take over when the tab goes away instead. docs/framing.md also names the
// end of a session as a moment for it; nothing says so here, and the backlog carries that half.
const WORKER = '/sw.js'

export function KeepOffline() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Registration is refused on a page served over plain http from anything but loopback, which is
    // how the manual pass on a physical device reaches a laptop, and in private browsing. Neither is
    // a failure the reader can act on, and an unhandled rejection is noise in the one console the
    // pass is read from.
    const registered = navigator.serviceWorker.register(WORKER).catch(() => null)

    const handOver = () => {
      if (document.visibilityState !== 'hidden') return

      void registered.then((registration) => registration?.waiting?.postMessage('activate'))
    }

    document.addEventListener('visibilitychange', handOver)

    return () => {
      document.removeEventListener('visibilitychange', handOver)
    }
  }, [])

  return null
}
