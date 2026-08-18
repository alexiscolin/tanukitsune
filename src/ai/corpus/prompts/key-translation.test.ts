import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { describe, expect, it } from 'vitest'

import { keyTranslationPrefix, keyTranslationRequest, readKeyTranslation } from './key-translation'

// A language that is not French, so a rule leaking back into the prompt shows up here rather than in a
// run six months from now.
const prefix = keyTranslationPrefix('Latin', ['canis', 'draco'])

describe('keyTranslationPrefix', () => {
  it('names the language it is translating into', () => {
    expect(prefix).toContain('Latin')
  })

  // The whole reason this prompt is allowed to write a word at all: the release states a meaning in
  // English and none in the locale, so the word is carried across rather than invented.
  it('asks for the English meaning carried across rather than for a new one', () => {
    expect(prefix).toContain('English')
  })

  it('names what the course teaches as the meaning to land on', () => {
    expect(prefix).toContain('taught')
  })

  // One word per subject and one subject per word. A word already answering for another character
  // cannot answer for this one, and the model is the only thing that can propose a different one: 俺
  // came back as je, which 僕 holds, and stood without a key rather than being asked again.
  it('carries the words already answering for another character', () => {
    expect(prefix).toContain('canis, draco')
  })
})

describe('keyTranslationRequest', () => {
  const request = keyTranslationRequest(prefix, { character: '龍', english: ['dragon', 'imperial'], taught: ['Dragon'] })

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

  // The course teaches 諦 as give up while the dictionary states truth first, its classical sense, so
  // carrying the dictionary's first word across teaches a meaning the reader is never graded on. What
  // the course teaches travels as the target and the dictionary as the support.
  it('carries what the course teaches, apart from the dictionary meanings', () => {
    const asked = keyTranslationRequest(prefix, { character: '諦', english: ['truth', 'abandon'], taught: ['Give Up'] })
    const [message] = asked.messages

    expect(message?.content).toContain('<taught>Give Up</taught>')
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
