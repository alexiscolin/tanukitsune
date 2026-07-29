import { describe, expect, it } from 'vitest'

import { enterSubmits } from './composition-gate'

describe('enterSubmits', () => {
  it('submits an Enter pressed with no input method editor in play', () => {
    expect(enterSubmits({ isComposing: false, pressedAt: 1000, compositionEndedAt: null })).toBe(true)
  })

  it('refuses the Enter the editor reports as part of an active composition', () => {
    expect(enterSubmits({ isComposing: true, pressedAt: 1000, compositionEndedAt: null })).toBe(false)
  })

  it('refuses an Enter arriving in the same tick as the composition that just ended', () => {
    expect(enterSubmits({ isComposing: false, pressedAt: 1000.2, compositionEndedAt: 1000 })).toBe(false)
  })

  it('submits an Enter pressed as its own gesture after a conversion was confirmed', () => {
    expect(enterSubmits({ isComposing: false, pressedAt: 1200, compositionEndedAt: 1000 })).toBe(true)
  })

  it('holds the line at thirty milliseconds, the last moment one keystroke can own both events', () => {
    expect(enterSubmits({ isComposing: false, pressedAt: 1030, compositionEndedAt: 1000 })).toBe(false)
    expect(enterSubmits({ isComposing: false, pressedAt: 1030.1, compositionEndedAt: 1000 })).toBe(true)
  })
})
