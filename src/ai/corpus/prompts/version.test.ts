import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { COMPONENT_NAME_VERSION, componentNamePrefix, componentNameRequest } from './component-name'
import { KEY_CHOICE_VERSION, keyChoicePrefix, keyChoiceRequest } from './key-choice'
import { KEY_TRANSLATION_VERSION, keyTranslationPrefix, keyTranslationRequest } from './key-translation'

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
  3: '8a4b85efd3327b554b64b4ed1e3cea70cc5e76c1a9e300c1d345655a9a56a1d3',
}

const RECORDED_CHOICE: Record<number, string> = {
  1: '75ed2507db9e8e07e5b5cbd620e3964cee7da51a2652cd944837ae5a58c4505a',
}

const RECORDED_TRANSLATION: Record<number, string> = {
  1: '9cb0874172bf33f89dd853cd0b3a524fc36cd3c6106453d12219f83dd34a2183',
}

describe('the key translation prompt', () => {
  it('has not changed without its version changing', () => {
    const recorded = RECORDED_TRANSLATION[KEY_TRANSLATION_VERSION]

    expect(
      recorded,
      `version ${KEY_TRANSLATION_VERSION} has no recorded hash. Record ${renderedTranslation()} against it.`,
    ).toBeDefined()
    expect(renderedTranslation(), 'the prompt changed. Bump its version and record the new hash.').toBe(recorded)
  })
})

function renderedTranslation(): string {
  const asked = keyTranslationRequest(keyTranslationPrefix('French'), { character: '龍', english: ['dragon'] })

  return createHash('sha256')
    .update(JSON.stringify({ ...asked, model: undefined }))
    .digest('hex')
}

describe('the key choice prompt', () => {
  it('has not changed without its version changing', () => {
    const recorded = RECORDED_CHOICE[KEY_CHOICE_VERSION]

    expect(
      recorded,
      `version ${KEY_CHOICE_VERSION} has no recorded hash. Record ${renderedChoice()} against it.`,
    ).toBeDefined()
    expect(renderedChoice(), 'the prompt changed. Bump its version and record the new hash.').toBe(recorded)
  })
})

// Fixed inputs, for the same reason: what moves is the wording and never the character asked about.
function renderedChoice(): string {
  const asked = keyChoiceRequest(keyChoicePrefix('French'), { character: '乙', glosses: ['chic', 'second'] })

  return createHash('sha256')
    .update(JSON.stringify({ ...asked, model: undefined }))
    .digest('hex')
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
