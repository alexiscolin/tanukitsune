import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, LOCALES } from './locales'
import { copyFor } from './site-copy'

describe('copyFor', () => {
  it('gives every locale the route tree serves a complete set of strings', () => {
    for (const locale of LOCALES) {
      for (const value of Object.values(copyFor(locale))) {
        expect(value).not.toBe('')
      }
    }
  })

  it('falls back to the default locale rather than returning undefined', () => {
    expect(copyFor('de')).toEqual(copyFor(DEFAULT_LOCALE))
  })
})
