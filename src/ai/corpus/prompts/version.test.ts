import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { ANCHOR_VERSION, anchorPrefix, anchorRequest } from './anchor'
import { COMPONENT_NAME_VERSION, componentNamePrefix, componentNameRequest } from './component-name'
import { KEY_CHOICE_VERSION, keyChoicePrefix, keyChoiceRequest } from './key-choice'
import { KEY_TRANSLATION_VERSION, keyTranslationPrefix, keyTranslationRequest } from './key-translation'
import { WORD_MEANING_VERSION, wordMeaningPrefix, wordMeaningRequest } from './word-meaning'

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
  4: '0d55511198d3766e3f65b57f8ca042e0655927c80a6539b6274ceea8d3dedf79',
  5: '57b173e9e978e12f511637d1a3b1c80494eb95d37604ce57251e02589e9e42a6',
}

const RECORDED_CHOICE: Record<number, string> = {
  1: '75ed2507db9e8e07e5b5cbd620e3964cee7da51a2652cd944837ae5a58c4505a',
}

const RECORDED_MEANING: Record<number, string> = {
  1: '7b7ddd9604475178d2a2742efe5ce96ef988dd24932754b2b6d24196f99f7ff9',
  2: '11be8ecabeb337615567c7c48e2b58c5d1406b861e8e4a28a965405af8d78104',
}

const RECORDED_TRANSLATION: Record<number, string> = {
  1: '9cb0874172bf33f89dd853cd0b3a524fc36cd3c6106453d12219f83dd34a2183',
  2: '7041569055c4f0920e8a5b0e9bd5fdbd568d1ec9bc9470f4cbbe05f1c83738b8',
  3: 'fa91dbc6851e5202e5659504d54d84dc50868b57428334580f19b28c771265fd',
}

const RECORDED_ANCHOR: Record<number, string> = {
  1: '0a0ef44f51b885156b7e5ce87eaa3531d65fdd8b0cba9b107cf3863c863fabf7',
  2: '880c5064c9988f5c4f8a28760a54148a8ae771b7b52bee6911d0e5238de5faf4',
}

describe('the anchor prompt', () => {
  it('has not changed without its version changing', () => {
    const recorded = RECORDED_ANCHOR[ANCHOR_VERSION]

    expect(recorded, `version ${ANCHOR_VERSION} has no recorded hash. Record ${renderedAnchor()} against it.`).toBeDefined()
    expect(renderedAnchor(), 'the prompt changed. Bump its version and record the new hash.').toBe(recorded)
  })
})

function renderedAnchor(): string {
  const asked = anchorRequest(anchorPrefix('French', ['scie']), {
    reading: 'こう',
    said: 'kou',
    heard: 'k o o',
    spelled: '',
    taught: ['工', '公'],
  })

  return createHash('sha256')
    .update(JSON.stringify({ ...asked, model: undefined }))
    .digest('hex')
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
  const asked = keyTranslationRequest(keyTranslationPrefix('French', ['chien']), {
    character: '龍',
    english: ['dragon'],
    taught: ['Dragon'],
  })

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

describe('the word meaning prompt', () => {
  it('has not changed without its version changing', () => {
    const recorded = RECORDED_MEANING[WORD_MEANING_VERSION]

    expect(
      recorded,
      `version ${WORD_MEANING_VERSION} has no recorded hash. Record ${renderedMeaning()} against it.`,
    ).toBeDefined()
    expect(renderedMeaning(), 'the prompt changed. Bump its version and record the new hash.').toBe(recorded)
  })
})

function renderedMeaning(): string {
  const asked = wordMeaningRequest(wordMeaningPrefix('French'), {
    word: '三人',
    parts: [
      { character: '三', key: 'trois' },
      { character: '人', key: 'personne' },
    ],
    taught: ['Three People'],
  })

  return createHash('sha256')
    .update(JSON.stringify({ ...asked, model: undefined }))
    .digest('hex')
}
