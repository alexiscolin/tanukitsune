import { describe, expect, it } from 'vitest'

import { readBuildInfo } from './build-info'

describe('readBuildInfo', () => {
  it('reports the commit and the build time the environment carries', () => {
    const info = readBuildInfo({ TANUKITSUNE_COMMIT: 'a3f9c1e', TANUKITSUNE_BUILT_AT: '2026-07-28T09:00:00Z' })

    expect(info).toEqual({ commit: 'a3f9c1e', builtAt: '2026-07-28T09:00:00Z' })
  })

  it('reports unknown for a build that did not stamp itself', () => {
    expect(readBuildInfo({})).toEqual({ commit: 'unknown', builtAt: 'unknown' })
  })
})
