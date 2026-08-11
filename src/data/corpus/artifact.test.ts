import { describe, expect, it } from 'vitest'

import { componentNamesFile, readComponentNames, readDecompositions, readNaming, readPhonology } from './artifact'

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
  // The list is the locale's and the rule is the engine's, so a second language is a folder rather
  // than a branch in the code.
  it('reads what the language cannot begin a word with', () => {
    expect(readPhonology('{"cannotStart":["h","ts"]}').cannotStart).toEqual(['h', 'ts'])
  })

  it('refuses a file that names no such list', () => {
    expect(() => readPhonology('{}')).toThrow()
  })
})
