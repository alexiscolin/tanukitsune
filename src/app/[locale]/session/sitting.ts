'use client'

import { useEffect, useState } from 'react'

import type { Assignment } from '@/core/knowledge-source'
import { deckFor } from '@/core/review/deck'
import { DECK_PATH } from '@/core/routes'
import type { Flow, Subject } from '@/core/subject'
import { heldDeck, holdDeck } from '@/data/local/deck-cache'

// What a screen deals, and the one place that resolves it. The server sends a shell, so the sitting
// is asked for here: from the account where it can be reached, and from the device where it cannot.
// A sitting that arrived is written back, which is what makes the next time work with no network.
//
// Three answers rather than two. Not yet is what the first paint is, and a screen reading it as
// nothing would show the offline line for a frame before the cards it holds arrive.
export type Sitting =
  | { readonly ready: false }
  | { readonly ready: true; readonly demo: true }
  | { readonly ready: true; readonly demo: false; readonly deck: readonly Subject[] }

// What the route answers, which is the shape waiting.ts declares on the other side of it.
type Answered =
  | { demo: true }
  | { demo: false; subjects: readonly Subject[]; waiting: readonly Assignment[] }

async function fromAccount(flow: Flow): Promise<Answered | null> {
  const answered = await fetch(`${DECK_PATH}?flow=${flow}`).catch(() => null)

  return answered?.ok === true ? ((await answered.json()) as Answered) : null
}

export function useSitting(flow: Flow): Sitting {
  const [sitting, setSitting] = useState<Sitting>({ ready: false })

  useEffect(() => {
    let wanted = true

    const settle = (next: Sitting) => {
      if (wanted) setSitting(next)
    }

    void (async () => {
      const answered = await fromAccount(flow)

      if (answered?.demo === true) {
        settle({ ready: true, demo: true })

        return
      }

      if (answered !== null) {
        settle({ ready: true, demo: false, deck: deckFor(answered.waiting, answered.subjects) })
        // Held after the screen has what it needs, so a slow write never delays a card. A cache
        // that could not be written is a session that will need a network next time, which is
        // where it already is.
        await holdDeck(flow, answered.subjects, answered.waiting).catch(() => undefined)

        return
      }

      // Nothing answered, which is what the device holds a sitting for. An empty deck is what the
      // screen shows its offline line on, and a cache that will not read is one of those.
      const held = await heldDeck(flow).catch(() => null)

      settle({
        ready: true,
        demo: false,
        deck: held === null ? [] : deckFor(held.waiting, held.subjects),
      })
    })()

    return () => {
      wanted = false
    }
  }, [flow])

  return sitting
}
