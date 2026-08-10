import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { COMPONENT_NAME_VERSION } from './component-name'

// A version constant nobody bumps is worse than no version constant. `prompt_version` is a column on
// every corpus row and the prompt is expected to change between the budgeted runs, so two runs sharing
// a version make the provenance false while looking satisfied.
//
// Each module's text is hashed and the hash is recorded against its version. Editing the text without
// bumping the version breaks the recorded hash; bumping it leaves the new version with nothing
// recorded. Either way somebody has to say what they did.

const RECORDED: Record<string, Record<number, string>> = {
  'component-name.ts': { 1: 'efb45d4dc7e59fce4232088e64208ec8ed684235c3dfba284012f58dc03458aa' },
}

const VERSIONS: Record<string, number> = {
  'component-name.ts': COMPONENT_NAME_VERSION,
}

describe.each(Object.entries(VERSIONS))('%s', (file, version) => {
  it('has not changed without its version changing', () => {
    const recorded = RECORDED[file]?.[version]

    expect(
      recorded,
      `version ${version} of ${file} has no recorded hash. Record ${hashOf(file)} against it.`,
    ).toBeDefined()
    expect(hashOf(file), `${file} changed. Bump its version and record the new hash.`).toBe(recorded)
  })
})

function hashOf(file: string): string {
  return createHash('sha256').update(readFileSync(`src/ai/corpus/prompts/${file}`)).digest('hex')
}
