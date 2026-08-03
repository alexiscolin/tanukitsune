import { act, renderHook } from '@testing-library/react'
import type { UIEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCollapse } from './use-collapse'

// The sheet's scroll, coalesced to one reading a frame. A momentum scroll fires every few
// pixels and each reading renders the whole sheet, so what this guards is the difference
// between one render a frame and thirty.
//
// A .tsx rather than a .ts because the hook needs a document, and vitest.config.ts draws the
// line between its two projects on the extension.

// Frames are held rather than run, so a test says when one arrives and how many were asked
// for. The real one would fire on a clock this runner does not advance.
let frames: (() => void)[] = []

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (run: () => void) => frames.push(run))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames[id - 1] = () => {}
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// The handler reads one property off the event, so the event is that property. Building a real
// UIEvent would need a real scrolling box, which is the sheet this hook is kept apart from.
function scrolledBy(top: number): UIEvent<HTMLDivElement> {
  return { currentTarget: { scrollTop: top } } as unknown as UIEvent<HTMLDivElement>
}

describe('useCollapse', () => {
  it('starts with the sheet down and the character at full height', () => {
    expect(renderHook(() => useCollapse()).result.current.gone).toBe(0)
  })

  it('asks for one frame however many scroll events arrive before it runs', () => {
    const { result } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledBy(20))
      result.current.follow(scrolledBy(40))
      result.current.follow(scrolledBy(60))
    })

    expect(frames).toHaveLength(1)
  })

  // The share is the scroll over the distance the character gives up its room across, which is
  // what the card multiplies its two heights by.
  it('reports the share of the collapse the scroll has reached', () => {
    const { result } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledBy(70))
    })
    act(() => {
      frames[0]?.()
    })

    expect(result.current.gone).toBe(0.5)
  })

  it('stops at one, so a long scroll does not take more than the character has', () => {
    const { result } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledBy(4000))
    })
    act(() => {
      frames[0]?.()
    })

    expect(result.current.gone).toBe(1)
  })

  // A card leaves mid-scroll on every swipe, so the frame it asked for has to leave with it.
  it('cancels a pending frame when the card goes', () => {
    const cancel = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancel)

    const { result, unmount } = renderHook(() => useCollapse())

    act(() => {
      result.current.follow(scrolledBy(20))
    })
    unmount()

    expect(cancel).toHaveBeenCalledOnce()
  })
})
