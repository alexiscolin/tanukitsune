'use client'

import { useEffect, useRef, useState } from 'react'
import type { UIEvent } from 'react'

// Over how many scrolled pixels the character gives up its room. Short enough that the first
// pull already answers, long enough that a flick does not snap it away.
const COLLAPSE_OVER = 140

// How far the sheet has been pulled up, and the handler that follows it. A momentum scroll
// fires every few pixels and each event renders the whole sheet, so the reading is coalesced
// to one a frame, and a card that leaves mid-scroll takes its pending frame with it.
export function useCollapse() {
  const [gone, setGone] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  function follow(event: UIEvent<HTMLDivElement>) {
    if (frame.current !== null) return

    const sheet = event.currentTarget
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      setGone(Math.min(sheet.scrollTop / COLLAPSE_OVER, 1))
    })
  }

  return { gone, follow }
}
