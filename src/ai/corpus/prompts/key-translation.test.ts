import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { describe, expect, it } from 'vitest'

import { keyTranslationPrefix, keyTranslationRequest, readKeyTranslation } from './key-translation'

// A language that is not French, so a rule leaking back into the prompt shows up here rather than in a
// run six months from now.
const prefix = keyTranslationPrefix('Latin')

describe('keyTranslationPrefix', () => {
  it('names the language it is translating into', () => {
    expect(prefix).toContain('Latin')
  })

  // The whole reason this prompt is allowed to write a word at all: the release states a meaning in
  // English and none in the locale, so the word is carried across rather than invented.
  it('asks for the English meaning carried across rather than for a new one', () => {
    expect(prefix).toContain('English')
  })
})

describe('keyTranslationRequest', () => {
  const request = keyTranslationRequest(prefix, { character: '龍', english: ['dragon', 'imperial'] })

  it('carries the prefix as a cached system block', () => {
    const [block] = request.system as TextBlockParam[]

    expect(block?.text).toBe(prefix)
    expect(block?.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
  })

  it('delimits the character and every meaning it is given', () => {
    const [message] = request.messages

    expect(message?.content).toContain('<character>龍</character>')
    expect(message?.content).toContain('<meaning>dragon</meaning>')
  })
})

describe('readKeyTranslation', () => {
  it('reads the word the model returned', () => {
    expect(readKeyTranslation('{"key":"dragon"}')).toBe('dragon')
  })

  // Nothing rather than a throw, for the reason every reader here gives: one bad answer is one
  // character left without a key, where a throw would lose a batch already paid for. Whether the word
  // is one the locale can write is `faultInKey`'s question, asked where the answer is written.
  it('refuses an answer it cannot read', () => {
    expect(readKeyTranslation('not json')).toBeNull()
  })

  it('refuses an answer shaped as something else', () => {
    expect(readKeyTranslation('{"word":"dragon"}')).toBeNull()
  })
})
