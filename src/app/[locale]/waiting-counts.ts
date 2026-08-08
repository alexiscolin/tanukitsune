'use client'

import { useEffect, useState } from 'react'

import { DUE_PATH } from '@/core/routes'
import { FLOWS } from '@/core/subject'
import { heldDeck } from '@/data/local/deck-cache'

// What the start screen counts, and the one place that resolves it. The page is one shell for every
// reader of a deployment, so the counts are asked for here rather than rendered into a document a
// cache would keep on disk.
//
// Offline the count is what the device holds, which is a different number and a truer one: what is
// waiting upstream cannot be known with no network, and what can be dealt here can.
export type Counts = { readonly ready: boolean; readonly lessons: number; readonly reviews: number }

const ASK_TIMEOUT = 10_000
const UNREACHED = 503

async function fromAccount(): Promise<Counts | null> {
  const answered = await fetch(DUE_PATH, { signal: AbortSignal.timeout(ASK_TIMEOUT) }).catch(
    () => null,
  )

  if (answered === null || answered.status === UNREACHED) return null
  if (!answered.ok) throw new Error(`The waiting route answered ${answered.status}.`)

  const counted = (await answered.json()) as { lessons: number; reviews: number }

  return { ready: true, lessons: counted.lessons, reviews: counted.reviews }
}

async function fromDevice(): Promise<Counts> {
  const held = await Promise.all(FLOWS.map((flow) => heldDeck(flow).catch(() => null)))
  const counted = Object.fromEntries(
    FLOWS.map((flow, at) => [flow, held[at]?.subjects.length ?? 0]),
  ) as Record<(typeof FLOWS)[number], number>

  return { ready: true, lessons: counted.lesson, reviews: counted.review }
}

export function useWaitingCounts(demo: Counts | null): Counts {
  const [counts, setCounts] = useState<Counts>(demo ?? { ready: false, lessons: 0, reviews: 0 })

  useEffect(() => {
    if (demo !== null) return

    let wanted = true

    const settle = (counted: Counts) => {
      if (wanted) setCounts(counted)
    }

    void (async () => {
      settle((await fromAccount()) ?? (await fromDevice()))
    })()

    return () => {
      wanted = false
    }
  }, [demo])

  return counts
}
