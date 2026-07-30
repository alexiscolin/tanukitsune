import { describe, expect, it } from 'vitest'

import { pressEnter } from './composition-gate'

describe('pressEnter', () => {
  it('submits an Enter pressed with no input method editor in play', () => {
    expect(pressEnter({ isComposing: false, pressedAt: 1000 }, null).submits).toBe(true)
  })

  it('refuses the Enter the editor reports as part of an active composition', () => {
    expect(pressEnter({ isComposing: true, pressedAt: 1000 }, null).submits).toBe(false)
  })

  it('refuses an Enter arriving in the same tick as the composition that just ended', () => {
    expect(pressEnter({ isComposing: false, pressedAt: 1000.2 }, 1000).submits).toBe(false)
  })

  it('submits an Enter pressed as its own gesture after a conversion was confirmed', () => {
    expect(pressEnter({ isComposing: false, pressedAt: 1200 }, 1000).submits).toBe(true)
  })

  it('holds the line at thirty milliseconds, the last moment one keystroke can own both events', () => {
    expect(pressEnter({ isComposing: false, pressedAt: 1030 }, 1000).submits).toBe(false)
    expect(pressEnter({ isComposing: false, pressedAt: 1030.1 }, 1000).submits).toBe(true)
  })

  it('consumes the confirmation on the Enter it refused, so the next one is judged on its own', () => {
    const refused = pressEnter({ isComposing: false, pressedAt: 1000.2 }, 1000)

    expect(refused.compositionEndedAt).toBe(null)
    expect(pressEnter({ isComposing: false, pressedAt: 1000.4 }, refused.compositionEndedAt).submits).toBe(true)
  })

  it('consumes it on an Enter it accepted too, so a stale confirmation cannot outlive one press', () => {
    expect(pressEnter({ isComposing: false, pressedAt: 1200 }, 1000).compositionEndedAt).toBe(null)
    expect(pressEnter({ isComposing: true, pressedAt: 1000 }, 1000).compositionEndedAt).toBe(null)
  })
})
