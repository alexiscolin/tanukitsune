import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { COMPONENT_NAME_VERSION, componentNamePrefix, componentNameRequest } from './component-name'

// A version constant nobody bumps is worse than no version constant. `prompt_version` is a column on
// every corpus row and the prompt is expected to change between the budgeted runs, so two runs sharing
// a version make the provenance false while looking satisfied.
//
// What is hashed is the text the model is sent, rendered with fixed inputs, and not the file it was
// built in: renaming a local or fixing a comment costs nothing, and changing a word costs a version.
// The hash is recorded against that version, so editing the text without bumping it breaks the
// recorded hash and bumping it leaves the new version with nothing recorded. Either way somebody has
// to say what they did.

const RECORDED: Record<number, string> = {
  2: '62e15f5c4f64e5707fb1ec92477408d74dac4ce3cd81d065f2d0fa66bd195b9c',
}

describe('the component name prompt', () => {
  it('has not changed without its version changing', () => {
    const recorded = RECORDED[COMPONENT_NAME_VERSION]

    expect(
      recorded,
      `version ${COMPONENT_NAME_VERSION} has no recorded hash. Record ${rendered()} against it.`,
    ).toBeDefined()
    expect(rendered(), 'the prompt changed. Bump its version and record the new hash.').toBe(recorded)
  })
})

// Fixed inputs, so what moves is the wording and never the component that happened to be asked about.
function rendered(): string {
  const naming = {
    language: 'French',
    opensWith: ['le ', 'la '],
    letters: 'abcdefghijklmnopqrstuvwxyz',
    joiners: "' -",
    mostWords: 3,
    examples: [{ character: '口', name: 'la bouche' }],
  }
  const asked = componentNameRequest(componentNamePrefix(naming, ['la bouche']), {
    character: '口',
    composes: ['右', '名'],
    traditional: 'mouth',
  })
  // The model is left out: it is recorded per row as `generated_by`, so it is the one field that is
  // not part of what was asked. Everything else is, the schema and the ceiling included.
  return createHash('sha256')
    .update(JSON.stringify({ ...asked, model: undefined }))
    .digest('hex')
}
