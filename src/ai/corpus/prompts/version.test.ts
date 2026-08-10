import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { COMPONENT_NAME_VERSION, componentNameRequest } from './component-name'

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
  1: '2d6b12576fe091d5abb47157a05dd290578cbba010eba875ad8ab305d12f6ccf',
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
  const asked = componentNameRequest(['la bouche', "l'arbre"], {
    character: '口',
    composes: ['右', '名'],
    traditional: 'mouth',
  })

  return createHash('sha256')
    .update(JSON.stringify({ system: asked.system, messages: asked.messages }))
    .digest('hex')
}
