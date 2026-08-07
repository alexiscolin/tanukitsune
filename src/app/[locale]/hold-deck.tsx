'use client'

import { useEffect } from 'react'

import type { Assignment } from '@/core/knowledge-source'
import type { Subject } from '@/core/subject'
import { holdDeck } from '@/data/local/deck-cache'

// What puts the sitting on the device. It renders nothing and exists to hold the write, and it is a
// client component because the database is the browser's.
//
// It is rendered only where the deck came from an account: the seeded one is a constant already in
// the bundle, so caching it would spend a write to hold what a reload rebuilds for free.
export function HoldDeck({
  subjects,
  waiting,
}: {
  subjects: readonly Subject[]
  waiting: readonly Assignment[]
}) {
  useEffect(() => {
    // A cache that could not be written is a session that will need a network next time, which is
    // where it already is. There is nothing to report and nothing to undo.
    void holdDeck(subjects, waiting).catch(() => undefined)
  }, [subjects, waiting])

  return null
}
