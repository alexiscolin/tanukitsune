import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, LOCALES } from './locales'
import { copyFor } from './site-copy'

// Reaches through the groups, because `Object.values` does not: a group is one value that
// is not a string, so a check written over the top level passes on it and stops covering
// every string underneath it.
function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(stringsIn)

  return []
}

describe('copyFor', () => {
  it('gives every locale the route tree serves a complete set of strings', () => {
    for (const locale of LOCALES) {
      const strings = stringsIn(copyFor(locale))

      // The count is asserted so that a set reduced to nothing cannot pass a loop over it.
      expect(strings.length).toBeGreaterThan(0)
      for (const value of strings) expect(value).not.toBe('')
    }
  })

  it('falls back to the default locale rather than returning undefined', () => {
    expect(copyFor('de')).toEqual(copyFor(DEFAULT_LOCALE))
  })
})
