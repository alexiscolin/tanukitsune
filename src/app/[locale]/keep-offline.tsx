'use client'

import { useEffect } from 'react'

// What registers the service worker, and the only thing that does. It renders nothing and is a
// client component because a worker is the browser's.
//
// A worker that took over mid-session would change the screen under a reader who was answering, so
// a waiting one is told to take over when the application goes away instead. That is the update
// timing docs/framing.md asks for, and the tab going hidden is the event that means it.
const WORKER = '/sw.js'

export function KeepOffline() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const registered = navigator.serviceWorker.register(WORKER)

    const handOver = () => {
      if (document.visibilityState !== 'hidden') return

      void registered.then((registration) => registration.waiting?.postMessage('activate'))
    }

    document.addEventListener('visibilitychange', handOver)

    return () => {
      document.removeEventListener('visibilitychange', handOver)
    }
  }, [])

  return null
}
