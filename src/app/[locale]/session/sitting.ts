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
// `reached` is not `deck.length > 0`. An account that answered with nothing is a queue the reader
// has finished, which ends the session; a device holding nothing is a session that cannot start.
// The two look the same and read the opposite, so the screen is told which it met.
export type Sitting =
  | { readonly ready: false }
  | { readonly ready: true; readonly reached: boolean; readonly deck: readonly Subject[] }
  // A refusal rather than silence. It is handed back rather than thrown from here, because a throw
  // inside an effect reaches no boundary: the screen throws it while rendering, which is what the
  // error page is for and what a blank tab is not.
  | { readonly ready: true; readonly broke: Error }

// What one call may take before the device answers instead. A request has no deadline of its own,
// so a socket that opens and never replies would leave the screen blank for as long as the tab
// lives, with a complete sitting unread beside it.
const ASK_TIMEOUT = 10_000

type Answered = { subjects: readonly Subject[]; waiting: readonly Assignment[] }

// The status this route answers where the source did not, which is the offline case seen from the
// server side of it.
const UNREACHED = 503

// Null where nothing answered, which is the case the device holds a sitting for: no network here,
// or no source there. Anything else is a defect this client is right to raise rather than to read as
// offline, because a stale deck answered into the queue is rows the flush will push at an account
// that refused them.
async function fromAccount(flow: Flow): Promise<Answered | null> {
  const answered = await fetch(`${DECK_PATH}?flow=${flow}`, {
    signal: AbortSignal.timeout(ASK_TIMEOUT),
  }).catch(() => null)

  if (answered === null || answered.status === UNREACHED) return null
  if (!answered.ok) throw new Error(`The deck route answered ${answered.status}.`)

  return (await answered.json()) as Answered
}

// Asked only where there is an account to ask. The seeded deck is a constant in this bundle, so a
// demo that asked would wait on a request for cards it already holds, and would write an empty
// sitting over whatever the device was keeping for a real one.
export function useSitting(flow: Flow, ask: boolean): Sitting {
  // Settled before the first paint where there is nothing to ask, rather than settled by an effect:
  // the seeded deck is already here, and a state that starts unready would blank the screen for a
  // frame to announce a request nobody made.
  const [sitting, setSitting] = useState<Sitting>(
    ask ? { ready: false } : { ready: true, reached: true, deck: [] },
  )

  useEffect(() => {
    if (!ask) return

    let wanted = true

    const settle = (next: Sitting) => {
      if (wanted) setSitting(next)
    }

    void (async () => {
      const answered = await fromAccount(flow).catch((broke: unknown) => {
        settle({ ready: true, broke: broke instanceof Error ? broke : new Error(String(broke)) })

        return undefined
      })

      if (answered === undefined) return

      if (answered !== null) {
        settle({ ready: true, reached: true, deck: deckFor(answered.waiting, answered.subjects) })
        // Held after the screen has what it needs, so a slow write never delays a card. A cache
        // that could not be written is a session that will need a network next time, which is
        // where it already is.
        await holdDeck(flow, answered.subjects, answered.waiting).catch(() => undefined)

        return
      }

      const held = await heldDeck(flow).catch(() => null)

      settle({
        ready: true,
        reached: false,
        deck: held === null ? [] : deckFor(held.waiting, held.subjects),
      })
    })()

    return () => {
      wanted = false
    }
  }, [ask, flow])

  return sitting
}
