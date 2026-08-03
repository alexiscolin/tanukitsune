import { describe, expect, it } from 'vitest'

import { convertReading, isReading } from './kana-conversion'

// The two rules that decide what a reading answer becomes and whether it is one at all. They
// run on every keystroke of a reading question, and the field refuses rather than grades when
// the second says no, so what these get wrong is an answer no tier ever sees.

describe('isReading', () => {
  it('accepts hiragana and katakana', () => {
    expect(isReading('した')).toBe(true)
    expect(isReading('カ')).toBe(true)
  })

  it('refuses latin, which is what the field is written to catch', () => {
    expect(isReading('shita')).toBe(false)
    expect(isReading('descendre')).toBe(false)
  })

  it('refuses a kanji, and a reading that mixes one in', () => {
    expect(isReading('下')).toBe(false)
    expect(isReading('下がる')).toBe(false)
  })

  // The prolongation mark is kana and is not a syllable, which is the whole reason the rule
  // asks for a syllable rather than trusting the kana test alone.
  it('refuses kana carrying no syllable', () => {
    expect(isReading('ー')).toBe(false)
  })

  it('refuses an empty answer', () => {
    expect(isReading('')).toBe(false)
  })

  // The middle dot is what the card itself puts between two readings, so a reader copying one
  // back brings it along. It is kana by the library's reckoning and it is not a syllable, and
  // grading it would cost an item its stage.
  it('refuses the separator the card sets between readings', () => {
    expect(isReading('・')).toBe(false)
  })

  // Half-width katakana is what a Japanese keyboard on a narrow phone still emits, and it is
  // the reason the answer is normalised before either question is asked of it.
  it('accepts a half-width reading, which normalises to the full-width one', () => {
    expect(isReading('ｼﾀ')).toBe(true)
  })
})

describe('convertReading', () => {
  // What the field really does per keystroke: the input holds the kana shown so far plus the
  // latin just pressed, and the buffer holds every latin character that produced them.
  it('adds the new latin to the buffer and shows the kana it makes so far', () => {
    expect(convertReading('shi', 'しt', 'し', true)).toEqual({ buffer: 'shit', value: 'しt' })
  })

  it('completes a syllable once the latin that finishes it arrives', () => {
    expect(convertReading('shit', 'しta', 'しt', true)).toEqual({ buffer: 'shita', value: 'した' })
  })

  // Why the buffer exists at all. A second n is a syllable of its own until the vowel that
  // follows says it was not, and only the latin can be reread to correct it: converting the
  // kana already shown plus the new letter reaches てんんお and stays there.
  it('holds a doubled n as its own syllable while it still might be one', () => {
    expect(convertReading('ten', 'てんn', 'てん', true)).toEqual({
      buffer: 'tenn',
      value: 'てんん',
    })
  })

  it('takes it back once the vowel says it was not', () => {
    expect(convertReading('tenn', 'てんんo', 'てんん', true)).toEqual({
      buffer: 'tenno',
      value: 'てんの',
    })
  })

  // Kana cannot be turned back into the latin that produced it, so the buffer is the only
  // record of what was pressed, and it only grows while the reader is adding at the end.
  it('starts the buffer over when the change is not an addition at the end', () => {
    expect(convertReading('shita', 'し', 'した', true)).toEqual({ buffer: 'し', value: 'し' })
  })

  // A caret moved back into the middle means the reader is correcting, and converting there
  // would rewrite what they came back to fix.
  it('leaves the text alone when the caret is not at the end', () => {
    expect(convertReading('shita', 'shta', 'した', false)).toEqual({
      buffer: 'shta',
      value: 'shta',
    })
  })
})
