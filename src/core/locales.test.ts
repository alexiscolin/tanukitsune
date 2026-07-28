import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, isLocale } from './locales'

describe('isLocale', () => {
  it('accepts a locale the route tree serves', () => {
    expect(isLocale(DEFAULT_LOCALE)).toBe(true)
  })

  it('rejects anything else, so a segment from the URL cannot widen the type', () => {
    expect(isLocale('en')).toBe(false)
    expect(isLocale('../etc')).toBe(false)
  })
})
