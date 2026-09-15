import { describe, expect, it } from 'vitest'

import { KANJI, VERB } from '../demo-deck'
import type { Assignment } from '../knowledge-source'
import { CLAIMED } from '../grading/claimed'
import { deckFor, SESSION_LENGTH, sessionOf, withText } from './deck'

// The identifier is what a submission names, and nothing here submits: the deck deals cards by
// subject, so it is derived rather than passed and no case below has to carry one.
function waiting(subjectId: number, srsStage: number): Assignment {
  return { id: subjectId * 10, subjectId, srsStage }
}

describe('deckFor', () => {
  // The stage is what this reader has done with the subject and not what the subject is, so it
  // arrives from the assignment. The row an answer becomes records it before the answer, which
  // is a fact that exists nowhere else once the answer has moved it.
  it('carries the stage the assignment holds onto the subject it names', () => {
    const deck = deckFor([waiting(KANJI.id, 4)], [KANJI])

    expect(deck[0]?.srsStage).toBe(4)
  })

  // What is waiting is the queue, and the subjects are what was fetched for it: the source is
  // asked for both separately and the second answer can be shorter than the first.
  it('deals what is waiting in the order it is waiting in', () => {
    const deck = deckFor([waiting(VERB.id, 1), waiting(KANJI.id, 2)], [KANJI, VERB])

    expect(deck.map((subject) => subject.id)).toEqual([VERB.id, KANJI.id])
  })

  // A subject above what the subscription grants is never fetched, so its assignment names
  // nothing. Dealing it would put a card on screen with no content behind it.
  it('drops what is waiting on a subject that was not fetched', () => {
    const deck = deckFor([waiting(KANJI.id, 4), waiting(9999, 1)], [KANJI])

    expect(deck.map((subject) => subject.id)).toEqual([KANJI.id])
  })

  // Content the source has withdrawn is never rendered and never asked, which is a rule about
  // the queue and not about the card: both flows deal from here, and one that kept it would
  // teach a subject its own source has taken back.
  it('drops what the source has withdrawn', () => {
    const deck = deckFor([waiting(KANJI.id, 0)], [{ ...KANJI, hidden: true }])

    expect(deck).toEqual([])
  })
})

describe('sessionOf', () => {
  // The source hands back everything that is due, which is the shape of their API and not of a
  // day. A queue of hundreds is a screen nobody finishes.
  it('takes one sitting from a queue longer than one', () => {
    const queue = Array.from({ length: SESSION_LENGTH * 3 }, (_, index) => waiting(index + 1, 1))

    expect(sessionOf(queue)).toHaveLength(SESSION_LENGTH)
  })

  it('takes the front of the queue as the source listed it', () => {
    const queue = [waiting(11, 1), waiting(22, 2)]

    expect(sessionOf(queue).map((entry) => entry.subjectId)).toEqual([11, 22])
  })
})

describe('withText', () => {
  // A part is a subject of its own. Left with what the source sent, the strip under the card names the
  // same pieces the story just named, in the source's language.
  it('names a part with what the locale wrote for that part', () => {
    const part = { id: 99, characters: '口', meaning: 'mouth' }
    const [joined] = withText(
      [{ ...KANJI, components: [part], usedIn: [part], similar: [part] }],
      new Map([[99, { meaning: 'la bouche', alsoAccepted: [], nuance: null, mnemonic: null, readingMnemonic: null }]]), CLAIMED)

    expect(joined?.components[0]?.meaning).toBe('la bouche')
    expect(joined?.usedIn[0]?.meaning).toBe('la bouche')
    expect(joined?.similar[0]?.meaning).toBe('la bouche')
  })

  it('leaves a part the locale wrote nothing for as it arrived', () => {
    const part = { id: 98, characters: '囗', meaning: 'enclosure' }
    const [joined] = withText([{ ...KANJI, components: [part] }], new Map(), CLAIMED)

    expect(joined?.components[0]?.meaning).toBe('enclosure')
  })

  it('gives a subject the text the locale wrote for it', () => {
    const [joined] = withText([KANJI], new Map([[KANJI.id, { meaning: 'le repos', alsoAccepted: [], nuance: 'la pause', mnemonic: 'une histoire', readingMnemonic: 'un son' }]]), CLAIMED)

    expect(joined?.nuance).toBe('la pause')
    expect(joined?.mnemonic).toBe('une histoire')
  })

  // The corpus holds several words for most subjects and a card shows one of them. The rest are
  // answers a reader who knows the meaning will type, so refusing them teaches that the one word
  // shown is the meaning rather than a meaning.
  it('accepts every other word the locale wrote for a subject, and shows none of them', () => {
    const [joined] = withText(
      [KANJI],
      new Map([[KANJI.id, { meaning: 'la force', alsoAccepted: ['la puissance', "l'effort"], nuance: null, mnemonic: null, readingMnemonic: null }]]), CLAIMED)

    expect(joined?.meanings).toEqual([{ text: 'la force', primary: true, accepted: true }])
    expect(joined?.alsoAccepted.slice(0, 2)).toEqual(['la puissance', "l'effort"])
  })

  // A locale that has not written a card yet is the ordinary state of every locale but the first, and
  // the reader still meets the card: the question is asked either way.
  it('leaves a subject the locale wrote nothing for alone', () => {
    const [, second] = withText([KANJI, VERB], new Map([[KANJI.id, { meaning: 'le repos', alsoAccepted: [], nuance: 'la pause', mnemonic: 'une histoire', readingMnemonic: 'un son' }]]), CLAIMED)

    expect(second?.nuance).toBe(VERB.nuance)
    expect(second?.mnemonic).toBe(VERB.mnemonic)
  })

  it('keeps the order the deck was dealt in', () => {
    const joined = withText([VERB, KANJI], new Map([[KANJI.id, { meaning: 'le repos', alsoAccepted: [], nuance: 'la pause', mnemonic: 'une histoire', readingMnemonic: 'un son' }]]), CLAIMED)

    expect(joined.map((one) => one.id)).toEqual([VERB.id, KANJI.id])
  })
})

describe('withText, the meaning the card asks for', () => {
  const WRITTEN = { meaning: 'le repos', alsoAccepted: [], nuance: 'la pause', mnemonic: 'une histoire', readingMnemonic: 'un son' }

  // The source deals its own curriculum in its own language, so what it calls the meaning is English.
  // A course that asks for it in English is not the product: the locale's word is the answer, and the
  // reader's own synonyms stay beside it because those are theirs.
  it('asks for the locale word rather than the one the source sent', () => {
    const [joined] = withText([KANJI], new Map([[KANJI.id, WRITTEN]]), CLAIMED)

    expect(joined?.meanings.map((gloss) => gloss.text)).toEqual(['le repos'])
    expect(joined?.meanings[0]?.accepted).toBe(true)
    expect(joined?.meanings[0]?.primary).toBe(true)
  })

  // The course teaches in French and the reader may still know the word in the source's English. The
  // card never prints it, so answering in English is knowledge the reader already had rather than a
  // second language the course teaches.
  it('accepts what the source accepts, and shows none of it', () => {
    const [joined] = withText([{ ...KANJI, alsoAccepted: ['rest'] }], new Map([[KANJI.id, WRITTEN]]), CLAIMED)

    expect(joined?.alsoAccepted).toContain('rest')
    expect(joined?.meanings.map((gloss) => gloss.text)).toEqual(['le repos'])
  })

  // Main is English for a hand and French for the hand 手 is taught under. Accepted on 本 because the
  // source spells it that way, it would grade another card's French answer correct at the exact tier.
  it('leaves out a source word spelled like a word the locale teaches', () => {
    const [joined] = withText([{ ...KANJI, alsoAccepted: ['Main', 'Rest'] }], new Map([[KANJI.id, WRITTEN]]), CLAIMED)

    expect(joined?.alsoAccepted).not.toContain('Main')
    expect(joined?.alsoAccepted).toContain('Rest')
  })

  // The seeded deck is written in French, so a source in its own language is stated here rather than
  // borrowed from it: the words below are nothing the locale teaches.
  const SOURCE = { ...KANJI, meanings: [{ text: 'Below', primary: true, accepted: true }], alsoAccepted: ['Underneath'] }

  it('accepts the words the source shows as meanings, which are the answer in its own language', () => {
    const [joined] = withText([SOURCE], new Map([[KANJI.id, WRITTEN]]), CLAIMED)

    expect(joined?.alsoAccepted).toEqual(['Below', 'Underneath'])
  })

  it('puts the locale word first, the source word behind it, and neither on the card twice', () => {
    const written = { ...WRITTEN, alsoAccepted: ['la pause'] }
    const [joined] = withText([SOURCE], new Map([[KANJI.id, written]]), CLAIMED)

    expect(joined?.alsoAccepted).toEqual(['la pause', 'Below', 'Underneath'])
  })

  // The card shows the source's words as well as accepting them: one line of glosses shown without
  // being accepted, one of glosses refused outright. Both are the source's language, so a card
  // answering in the locale's word would otherwise sit above two lines of somebody else's.
  // A gloss the source shows struck through is a word it tells the reader not to answer with, and the
  // blacklist is the same instruction without the line. The card prints neither, since both are the
  // source's language, and the grader still refuses both, since an English answer counts and a list
  // that only ever added words could not refuse one.
  it('shows none of the words the source sent, and keeps the ones it refuses for the grader alone', () => {
    const listed = { ...KANJI, refused: ['break'], meanings: [...KANJI.meanings, { text: 'pause', primary: false, accepted: false }] }
    const [joined] = withText([listed], new Map([[KANJI.id, WRITTEN]]), CLAIMED)

    expect(joined?.refused).toEqual([])
    expect(joined?.alsoRefused).toEqual(['break', 'pause'])
    expect(joined?.meanings.filter((gloss) => !gloss.accepted)).toEqual([])
    expect(joined?.alsoAccepted).not.toContain('pause')
  })

  it('leaves the source word where the locale wrote nothing', () => {
    const [joined] = withText([KANJI], new Map(), CLAIMED)

    expect(joined?.meanings).toEqual(KANJI.meanings)
  })
})
