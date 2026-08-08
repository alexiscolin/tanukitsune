import { describe, expect, it } from 'vitest'

import { moraeOf, phonemesOf } from './phonetics'

describe('moraeOf', () => {
  // A mora is what Japanese counts, and it is not a syllable: きょ is one, and the う after it is
  // another. An anchor that loses the count turns ちょう into ちょ, which is a different word.
  it('holds a small kana to the mora it belongs to', () => {
    expect(moraeOf('きょう')).toEqual(['きょ', 'う'])
  })

  it('counts a long vowel as the mora it is', () => {
    expect(moraeOf('ちょう')).toHaveLength(2)
    expect(moraeOf('ちょ')).toHaveLength(1)
  })

  // Both stand alone in the count while neither stands alone as a sound, which is exactly why a
  // French anchor chosen by ear misses them.
  it('counts the pause and the nasal as morae of their own', () => {
    expect(moraeOf('さっし')).toEqual(['さ', 'っ', 'し'])
    expect(moraeOf('かん')).toEqual(['か', 'ん'])
  })

  it('reads katakana as the same morae as kana', () => {
    expect(moraeOf('キョウ')).toEqual(['キョ', 'ウ'])
  })
})

describe('phonemesOf', () => {
  // Derived rather than declared: everything downstream compares sounds, and a comparison that runs
  // on spelling answers a question nobody asked.
  it('reads a plain mora as its consonant and its vowel', () => {
    expect(phonemesOf('か')).toEqual(['k', 'a'])
  })

  // The three French has no onset for, and the reason the impossible-onset table exists at all.
  it('keeps the sounds French cannot start a word with', () => {
    expect(phonemesOf('つ')).toEqual(['ts', 'u'])
    expect(phonemesOf('ふ')).toEqual(['ɸ', 'u'])
    expect(phonemesOf('は')).toEqual(['h', 'a'])
  })

  it('reads a palatalised mora as a consonant, a glide and a vowel', () => {
    expect(phonemesOf('きょ')).toEqual(['k', 'j', 'o'])
  })

  it('reads the nasal mora as one nasal consonant', () => {
    expect(phonemesOf('かん')).toEqual(['k', 'a', 'n'])
  })

  // A geminate is a held consonant rather than a repeated one, and it is what separates さつ from
  // さっ. It doubles the consonant that follows it, which is what a mora count alone cannot show.
  it('reads the pause as the consonant it holds', () => {
    expect(phonemesOf('さっし')).toEqual(['s', 'a', 'ɕ', 'ɕ', 'i'])
  })

  it('reads a long vowel as the vowel twice, since the length is what is contrastive', () => {
    expect(phonemesOf('こう')).toEqual(['k', 'o', 'o'])
  })
})
