'use client'

import { useEffect } from 'react'

import type { HeldDeck } from '@/data/local/database'
import { holdDeck } from '@/data/local/deck-cache'

// What puts the sitting on the device. It renders nothing and exists to hold the write, and it is a
// client component because the database is the browser's.
//
// The route renders it only where the deck came from an account: the seeded one is a constant
// already in the bundle, so caching it would spend a write to hold what a reload rebuilds, and
// writing an empty sitting would replace whatever the reader's own account had left there.
export function HoldDeck({ flow, subjects, waiting }: HeldDeck) {
  useEffect(() => {
    // A cache that could not be written is a session that will need a network next time, which is
    // where it already is. There is nothing to report and nothing to undo.
    void holdDeck(flow, subjects, waiting).catch(() => undefined)
  }, [flow, subjects, waiting])

  return null
}
