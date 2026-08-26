import { describe, expect, it } from 'vitest'

import {
  componentNamesFile,
  meaningsFile,
  readComponentNames,
  readDecompositions,
  readMeanings,
  readNaming,
  readPhonology,
} from './artifact'

const FILE = `{
"header":{"source":"KanjiVG","licence":"CC BY-SA 4.0"},
"characters":{
"休":[{"component":"亻","position":"left","parts":[]},{"component":"木","position":"right","parts":[]}],
"語":[{"component":"言","position":"left","parts":[]},{"component":"吾","position":"right","parts":[{"component":"五","position":null,"parts":[]}]}]
}
}`

describe('readDecompositions', () => {
  it('reads a character back with the parts it was written with', () => {
    const parts = readDecompositions(FILE).get('休')

    expect(parts?.map((part) => [part.component, part.position])).toEqual([
      ['亻', 'left'],
      ['木', 'right'],
    ])
  })

  it('reads the nesting back, which is what the depth rule is applied to', () => {
    const parts = readDecompositions(FILE).get('語')

    expect(parts?.[1]?.parts.map((part) => part.component)).toEqual(['五'])
  })

  // The artifact is generated and committed, so a file that is not one is a mistake in the pipeline
  // rather than a state to render around. It fails where it is read, with the reason.
  it('refuses a file that is not the artifact', () => {
    expect(() => readDecompositions('{"characters":"none"}')).toThrow()
  })
})

describe('readComponentNames', () => {
  it('reads what the locale calls each component', () => {
    const names = readComponentNames('{"header":{},"names":{"亻":"le passant","木":"l\'arbre"}}')

    expect(names['亻']).toBe('le passant')
  })

  // A locale that has named nothing yet is a locale at the start of its work, not a broken file. The
  // report is what says how much of it is left.
  it('reads a locale that has named nothing', () => {
    expect(readComponentNames('{"header":{},"names":{}}')).toEqual({})
  })

  it('refuses a file that is not a name list', () => {
    expect(() => readComponentNames('{"names":{"亻":3}}')).toThrow()
  })
})

describe('componentNamesFile', () => {
  // The header carries the Kanji Alive attribution, and the obligation follows the file rather than
  // the repository, so a writer that rebuilds the file from the names alone drops a licence notice.
  const written = '{\n  "header": {\n    "source": "Kanji Alive"\n  },\n  "names": {\n    "口": "la bouche"\n  }\n}\n'

  it('adds a name without touching the header', () => {
    const after = componentNamesFile(written, new Map([['木', "l'arbre"]]))

    expect(after).toContain('"source": "Kanji Alive"')
    expect(readComponentNames(after)).toEqual({ 口: 'la bouche', 木: "l'arbre" })
  })

  // A run that settles nothing still writes, and a file that comes back different after it would put
  // 186 lines nobody changed into the diff a reader has to read.
  it('gives the file back unchanged when a run settled nothing', () => {
    expect(componentNamesFile(written, new Map())).toBe(written)
  })

  it('refuses a file that is not a name list', () => {
    expect(() => componentNamesFile('{"names":{"亻":3}}', new Map())).toThrow()
  })
})

describe('readNaming', () => {
  const written =
    '{"language":"French","opensWith":["le "],"letters":"abc","joiners":"-","mostWords":3,"examples":[{"character":"口","name":"la bouche"}]}'

  // The shape is the locale's and the rule reading it is the engine's, the same split as the list
  // above: a second language brings different answers and no code.
  it('reads the shape a name takes in that language', () => {
    expect(readNaming(written).opensWith).toEqual(['le '])
    expect(readNaming(written).examples).toEqual([{ character: '口', name: 'la bouche' }])
  })

  it('refuses a file missing any of them rather than judging names by half a shape', () => {
    expect(() => readNaming('{"language":"French","opensWith":["le "],"letters":"abc","joiners":"-"}')).toThrow()
    expect(() => readNaming('{}')).toThrow()
  })

  // A shape that parses while being unusable refuses every name there is, and nothing would point at
  // the file it came from.
  it('refuses a shape no name could satisfy', () => {
    const with_ = (part: string) => `{"language":"French","letters":"abc","joiners":"-",${part}}`

    expect(() => readNaming(with_('"opensWith":[],"mostWords":2'))).toThrow()
    expect(() => readNaming(with_('"opensWith":["le "],"mostWords":0'))).toThrow()
  })
})

describe('readPhonology', () => {
  const SOUNDS =
    '{"cannotStart":["h","ts"],"nearest":0.5,"apart":0.2,"unrated":50,"atMostMorae":4,"atLeastCommon":1,"partsOfSpeech":["NOM"],"hears":{"ɕ":"ʃ"}}'

  // The list is the locale's and the rule is the engine's, so a second language is a folder rather
  // than a branch in the code.
  it('reads what the language cannot begin a word with', () => {
    expect(readPhonology(SOUNDS).cannotStart).toEqual(['h', 'ts'])
  })

  // How far a word may sit from a reading and still be heard in it is a fact about the pair of
  // languages, and what an unrated word is worth depends on the scale that locale's ratings use.
  it('reads how near an anchor must sound and how far two of them must sit apart', () => {
    expect(readPhonology(SOUNDS)).toMatchObject({ nearest: 0.5, apart: 0.2, unrated: 50 })
  })

  // What a word has to be before it can stand for a reading is this language's business too: how long
  // a reading may run before no one word carries it, how common the word must be, and what it may be.
  it('reads what a word of this language must be to stand for a reading', () => {
    expect(readPhonology(SOUNDS)).toMatchObject({ atMostMorae: 4, atLeastCommon: 1, partsOfSpeech: ['NOM'] })
  })

  it('refuses a file that names no such list', () => {
    expect(() => readPhonology('{}')).toThrow()
  })

  // A limit missing reads as a limit of nothing, and an allocation with no ceiling gives every reading
  // the first word that starts on its sound.
  it('refuses a file that leaves a limit unstated', () => {
    expect(() =>
      readPhonology('{"cannotStart":[],"nearest":0.5,"apart":0.2,"atMostMorae":4,"atLeastCommon":1,"partsOfSpeech":["NOM"],"hears":{}}'),
    ).toThrow()
  })

  // A reading is heard through the ears of the language it is taught in, and what that ear reaches for
  // is the locale's business: a second language substitutes other sounds, or none.
  it('reads what this language hears where a sound it does not make', () => {
    expect(readPhonology(SOUNDS).hears.get('ɕ')).toBe('ʃ')
  })
})

// A key is the one word a card shows; the others are words a reader typing them is right. Keeping only
// the key would grade "sol" wrong for 土, which the release states beside "terre".
describe('readMeanings', () => {
  it('reads every meaning a character is graded on, the shown one first', () => {
    const written = meaningsFile({ header: { of: 'test' }, meanings: { 土: ['terre', 'sol'], 川: ['rivière'] } })

    expect(readMeanings(written)['土']).toEqual(['terre', 'sol'])
    expect(readMeanings(written)['川']).toEqual(['rivière'])
  })

  it('refuses a character left with no meaning at all, which is a card that cannot be graded', () => {
    expect(() => readMeanings(meaningsFile({ header: { of: 'test' }, meanings: { 土: [] } }))).toThrow()
  })
})
