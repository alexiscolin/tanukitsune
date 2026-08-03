import { act, cleanup, renderHook } from '@testing-library/react'
import type { UIEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCollapse } from './use-collapse'

// The sheet's scroll, coalesced to one reading a frame. A momentum scroll fires every few
// pixels and each reading renders the whole sheet, so what this guards is the difference
// between one render a frame and thirty, and the reading landing where the finger ended
// rather than where it started.
//
// A .tsx rather than a .ts because the hook needs a document, and vitest.config.ts draws the
// line between its two projects on the extension.

// Frames are held rather than run, so a test says when one arrives. The runner's own clock
// does not drive this document's frames, so the queue is kept here.
let frames: (() => void)[] = []

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (run: () => void) => frames.push(run))
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(cleanup)

afterEach(() => {
  vi.unstubAllGlobals()
})

// One box for the whole burst, moved rather than replaced: the handler keeps the box the first
// event of a burst named and reads its position when the frame runs. A stub handing each event
// a box of its own would prove a reading happened and never that it was the latest one.
const sheet = { scrollTop: 0 }

function scrolledTo(top: number): UIEvent<HTMLDivElement> {
  sheet.scrollTop = top

  return { currentTarget: sheet } as unknown as UIEvent<HTMLDivElement>
}

function nextFrame() {
  act(() => {
    frames.shift()?.()
  })
}

describe('useCollapse', () => {
  it('starts with the sheet down and the character at full height', () => {
    expect(renderHook(() => useCollapse()).result.current.gone).toBe(0)
  })

  it('asks for one frame however many scroll events arrive before it runs', () => {
    const { result } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledTo(20))
      result.current.follow(scrolledTo(40))
      result.current.follow(scrolledTo(60))
    })

    expect(frames).toHaveLength(1)
  })

  // The reading a burst is coalesced into is its last position, not its first. Read at the
  // moment of the event instead, and the sheet lags a whole burst behind the finger.
  it('reads where the burst ended rather than where it began', () => {
    const { result } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledTo(20))
      result.current.follow(scrolledTo(40))
      result.current.follow(scrolledTo(60))
    })
    nextFrame()

    expect(result.current.gone).toBe(60 / 140)
  })

  // One a frame, not one at all: the gate the first reading closes is reopened by the frame
  // that runs it, or the sheet freezes where the reader first touched it.
  it('follows a second burst once the frame it was holding has run', () => {
    const { result } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledTo(20))
    })
    nextFrame()
    act(() => {
      result.current.follow(scrolledTo(90))
    })
    nextFrame()

    expect(result.current.gone).toBe(90 / 140)
  })

  it('stops at one, so a long scroll does not take more than the character has', () => {
    const { result } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledTo(4000))
    })
    nextFrame()

    expect(result.current.gone).toBe(1)
  })

  // A card leaves mid-scroll on every swipe, so the frame it asked for has to leave with it.
  // Nothing observable follows a frame that runs after the unmount, which is why the call is
  // the witness here rather than a state nobody can read.
  it('cancels a pending frame when the card goes', () => {
    const cancelled = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancelled)

    const { result, unmount } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledTo(20))
    })
    unmount()

    expect(cancelled).toHaveBeenCalledOnce()
  })
})
