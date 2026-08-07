'use client'

import { useEffect, useState } from 'react'

import { deckFor } from '@/core/review/deck'
import type { Flow, Subject } from '@/core/subject'
import { heldDeck } from '@/data/local/deck-cache'

// What a screen deals when the server sent nothing, which is what an unreachable account looks like
// from here. The sitting comes back from the device and is rebuilt through the same rule the server
// uses, so a card dealt offline is the card that would have been dealt online.
//
// Three answers rather than two: the deck, nothing at all, and not yet. Not yet is what the first
// paint is, and a screen that read it as nothing would show the offline line for a frame before the
// cards it holds arrive.
export type Dealt = { readonly ready: false } | { readonly ready: true; readonly deck: readonly Subject[] }

export function useDealtFromDevice(flow: Flow, given: unknown): Dealt {
  const [dealt, setDealt] = useState<Dealt>({ ready: given !== null, deck: [] } as Dealt)

  useEffect(() => {
    if (given !== null) return

    let wanted = true

    void heldDeck(flow)
      .then((held) => {
        if (wanted) setDealt({ ready: true, deck: held === null ? [] : deckFor(held.waiting, held.subjects) })
      })
      // A cache that could not be read is a session with nothing to deal, which is what an empty
      // deck already says. There is nothing to add and nothing to retry from here.
      .catch(() => {
        if (wanted) setDealt({ ready: true, deck: [] })
      })

    return () => {
      wanted = false
    }
  }, [flow, given])

  return dealt
}
