import { describe, expect, it } from 'vitest'

import { faultInAnchor } from './anchor-answer'
import type { Answer } from './anchor-answer'

const BOUNDS = { nearest: 0.5, apart: 0.1, atMostWords: 3, partsOfSpeech: ['NOM'] }

const HELD = [
  { anchor: 'nid', phonemes: ['n', 'i'] },
  { anchor: 'eau', phonemes: ['o'] },
]

const noun = (frequency = 10) => ({ category: 'NOM', frequency })

const answer = (one: Partial<Answer> & Pick<Answer, 'proposal' | 'heard' | 'said'>): Answer => ({
  words: [noun()],
  spelledWith: '',
  replacing: null,
  ...one,
})

describe('faultInAnchor', () => {
  it('accepts a word that begins on the reading and stays near it', () => {
<<<<<<< HEAD
    expect(faultInAnchor(answer({ proposal: 'chip', heard: ['ʃ', 'i', 'p'], said: ['ʃ', 'i'] }), HELD, BOUNDS)).toBeNull()
=======
    expect(faultInAnchor({ proposal: 'chip', heard: ['ʃ', 'i', 'p'], said: ['ʃ', 'i'] }, HELD, BOUNDS)).toBeNull()
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
  })

  // A phrase is the one thing the table cannot search, so it is what asking buys.
  it('accepts a phrase, which is what asking buys over searching', () => {
<<<<<<< HEAD
    const phrase = answer({ proposal: 'yack houx', heard: ['j', 'a', 'k', 'u'], said: ['j', 'a', 'k', 'u'] })

    expect(faultInAnchor({ ...phrase, words: [noun(), noun()] }, HELD, BOUNDS)).toBeNull()
=======
    expect(faultInAnchor({ proposal: 'yack houx', heard: ['j', 'a', 'k', 'u'], said: ['j', 'a', 'k', 'u'] }, HELD, BOUNDS)).toBeNull()
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
  })

  // The reading is bound to what the lexicon says the word sounds like, so a word it does not hold is a
  // word nothing can pronounce for us, and an anchor whose sounds are taken on trust is the
  // hallucinated pronunciation this whole layer exists to refuse.
  it('refuses a word the lexicon does not hold', () => {
<<<<<<< HEAD
    expect(faultInAnchor(answer({ proposal: 'hocco', heard: null, said: ['o', 'k', 'o'] }), HELD, BOUNDS)).toBe(
      'the lexicon holds no such word',
    )
  })

  it('refuses a word that does not begin on the sound the reading does', () => {
    expect(faultInAnchor(answer({ proposal: 'hyoïde', heard: ['i', 'o'], said: ['j', 'o'] }), HELD, BOUNDS)).toBe(
=======
    expect(faultInAnchor({ proposal: 'hocco', heard: null, said: ['o', 'k', 'o'] }, HELD, BOUNDS)).toBe('the lexicon holds no such word')
  })

  it('refuses a word that does not begin on the sound the reading does', () => {
    expect(faultInAnchor({ proposal: 'hyoïde', heard: ['i', 'o', 'i', 'd'], said: ['j', 'o', 'o'] }, HELD, BOUNDS)).toBe(
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
      'does not begin on the sound the reading does',
    )
  })

  // Half the sounds of the longer of the two, which is a word sharing its opening and nothing after it.
  it('refuses a word further from the reading than a reader can hear it in', () => {
<<<<<<< HEAD
    // Three quarters of the sounds of the longer of the two: a word sharing its opening and nothing after.
    const far = answer({ proposal: 'chiroptère', heard: ['ʃ', 'i', 'ʁ', 'ɔ', 'p', 't', 'ɛ', 'ʁ'], said: ['ʃ', 'i'] })

    expect(faultInAnchor(far, HELD, BOUNDS)).toBe('0.75 away, past 0.5')
=======
    expect(faultInAnchor({ proposal: 'oreiller', heard: ['ɔ', 'ʁ', 'ɛ', 'j', 'e'], said: ['o', 'ʁ', 'i'] }, HELD, { ...BOUNDS, nearest: 0.4 })).toBe(
      '0.50 away, past 0.4',
    )
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
  })

  it('refuses a word sitting nearer to a standing anchor than the limit allows', () => {
<<<<<<< HEAD
    expect(faultInAnchor(answer({ proposal: 'haut', heard: ['o'], said: ['o'] }), HELD, BOUNDS)).toBe(
      'sits nearer than 0.1 to eau',
    )
  })

  it('refuses a word already standing for another reading', () => {
    expect(faultInAnchor(answer({ proposal: 'nid', heard: ['n', 'i'], said: ['n', 'i'] }), HELD, BOUNDS)).toBe(
      'already stands for another reading',
    )
=======
    expect(faultInAnchor({ proposal: 'haut', heard: ['o'], said: ['o'] }, HELD, BOUNDS)).toBe('sits nearer than 0.1 to eau')
  })

  it('refuses a word already standing for another reading', () => {
    expect(faultInAnchor({ proposal: 'nid', heard: ['n', 'i'], said: ['n', 'i'] }, HELD, BOUNDS)).toBe('already stands for another reading')
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
  })

  // An anchor is the thing the reader meets, so a phrase carrying a word another anchor uses is not
  // that anchor. What keeps the two from being one cue is the separation above.
  it('accepts a phrase carrying a word another anchor uses', () => {
<<<<<<< HEAD
    const phrase = answer({ proposal: 'haut nid', heard: ['o', 'n', 'i'], said: ['o', 'n', 'i'] })

    expect(faultInAnchor({ ...phrase, words: [noun(), noun()] }, HELD, BOUNDS)).toBeNull()
  })

  it('refuses more words than a cue carries', () => {
    const long = answer({ proposal: 'un deux trois quatre', heard: ['œ̃', 'd'], said: ['œ̃', 'd'] })

    expect(faultInAnchor(long, HELD, BOUNDS)).toBe('more words than a cue carries')
  })

  // Every rule the table applies is applied again here, and the table searches one part of speech.
  it('refuses a word outside what a story is built on', () => {
    const verb = answer({ proposal: 'chiper', heard: ['ʃ', 'i'], said: ['ʃ', 'i'] })

    expect(faultInAnchor({ ...verb, words: [{ category: 'VER', frequency: 10 }] }, HELD, BOUNDS)).toBe(
      'NOM is what a story is built on',
=======
    expect(faultInAnchor({ proposal: 'haut nid', heard: ['o', 'n', 'i'], said: ['o', 'n', 'i'] }, HELD, BOUNDS)).toBeNull()
  })

  it('refuses more words than a cue carries', () => {
    expect(faultInAnchor({ proposal: 'un deux trois quatre', heard: ['œ̃', 'd', 'ø'], said: ['œ̃', 'd', 'ø'] }, HELD, BOUNDS)).toBe(
      'more words than a cue carries',
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
    )
  })

  // A reading opening on a sound the locale writes without saying it needs the letter on its anchor,
  // which is the whole of what tells it from a reading opening on the bare vowel.
  it('refuses a word without the letter the reading is written with', () => {
    const bare = answer({ proposal: 'orage', heard: ['o', 'ʁ'], said: ['o', 'ʁ'], spelledWith: 'h' })

    expect(faultInAnchor(bare, HELD, BOUNDS)).toBe('this reading opens on a sound written h and said by nobody')
  })

  // Half of what is asked for is a reading bound to a word so rare the cue must be learned first. An
  // answer rarer still is a request paid for to go backwards.
  it('refuses a word rarer than the one it was paid to replace', () => {
    const rare = answer({ proposal: 'hile', heard: ['i', 'l'], said: ['i', 'l'], replacing: 4 })

    expect(faultInAnchor({ ...rare, words: [noun(0.2)] }, HELD, BOUNDS)).toBe('rarer than the 4 of the word it replaces')
  })

  it('refuses an answer that says nothing', () => {
<<<<<<< HEAD
    expect(faultInAnchor(answer({ proposal: '   ', heard: [], said: ['ʃ', 'i'] }), HELD, BOUNDS)).toBe('no word at all')
=======
    expect(faultInAnchor({ proposal: '   ', heard: [], said: ['ʃ', 'i'] }, HELD, BOUNDS)).toBe('no word at all')
>>>>>>> 435463c (refactor(corpus): judge a written anchor where a test can reach the judging)
  })
})
