import { describe, expect, it } from 'vitest'

import { readDecompositions } from './artifact'

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
