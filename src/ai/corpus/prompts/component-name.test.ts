import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { describe, expect, it } from 'vitest'

import { componentName, componentNamePrefix, componentNameRequest, readComponentName } from './component-name'
import { CORPUS_MODEL } from '../request'

// A locale that is not French, so a rule leaking back into the prompt shows up here rather than in a
// run six months from now.
const NAMING = {
  language: 'Latin',
  opensWith: ['ille ', 'illa '],
  letters: 'abcdefghijklmnopqrstuvwxyz',
  joiners: ' -',
  mostWords: 2,
  examples: [{ character: '口', name: 'illa bucca' }],
}

const TAKEN = ['illa bucca', 'ille sol', 'illa arbor']

const prefix = (taken: readonly string[] = TAKEN) => componentNamePrefix(NAMING, taken)

function textOf(asked: ReturnType<typeof componentNameRequest>): TextBlockParam {
  const [block] = asked.system as TextBlockParam[]

  return block as TextBlockParam
}

describe('componentNamePrefix', () => {
  // The shape the checker enforces and the shape the model is asked for are one fact, so the prompt
  // reads it from the same material rather than restating it in prose that cannot move with it.
  it('asks for the shape the locale gives rather than one written into the prompt', () => {
    const text = prefix()

    expect(text).toContain('Latin')
    expect(text).toContain('ille ')
    expect(text).toContain('2 words at most after that')
    expect(text).toContain('illa bucca')
    expect(text).not.toContain('French')
    expect(text).not.toContain('three words')
    expect(text).not.toContain(' or   or ')
  })

  // A byte moving in the prefix invalidates the cache for every request behind it, so the taken names
  // are sorted rather than left in whatever order a map yielded them.
  it('orders the taken names so the prefix is the same bytes every run', () => {
    expect(prefix()).toBe(prefix([...TAKEN].reverse()))
  })
})

describe('componentNameRequest', () => {
  // Everything identical across a run belongs in the cached prefix and everything that moves belongs
  // after it, or the prefix is rewritten per request and the cache never reads.
  it('puts what every request shares in the cached prefix and the component after it', () => {
    const asked = componentNameRequest(prefix(), { character: '九', composes: ['丸', '究'] })

    // An hour rather than the default five minutes: a batch routinely runs longer than that, and a
    // prefix expiring mid-run is written again and read by nothing.
    expect(textOf(asked).cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
    expect(textOf(asked).text).toContain('illa bucca')
    expect(textOf(asked).text).not.toContain('九')
    expect(JSON.stringify(asked.messages)).toContain('九')
  })

  it('gives the model the kanji the component builds, which is what a name is judged on', () => {
    const asked = componentNameRequest(prefix(), { character: '九', composes: ['丸', '究'] })

    expect(JSON.stringify(asked.messages)).toContain('丸 究')
  })

  it('says so rather than inventing evidence when a component builds nothing', () => {
    const asked = componentNameRequest(prefix(), { character: '九', composes: [] })

    expect(JSON.stringify(asked.messages)).toContain('nothing on its own')
  })

  // Somebody else's prose reaching a prompt is delimited and labelled as something to read.
  it('delimits the traditional name where one exists and omits it where none does', () => {
    const withOne = componentNameRequest(prefix(), { character: '九', composes: ['丸'], traditional: 'nine' })
    const without = componentNameRequest(prefix(), { character: '九', composes: ['丸'] })

    expect(JSON.stringify(withOne.messages)).toContain('<traditional_name>nine</traditional_name>')
    expect(JSON.stringify(without.messages)).not.toContain('traditional_name')
  })

  it('asks for the pinned model and a shape strict enough to refuse an extra key', () => {
    expect(componentNameRequest(prefix(), { character: '九', composes: ['丸'] }).model).toBe(CORPUS_MODEL)
    expect(componentName.safeParse({ name: 'la bouche', why: 'because' }).success).toBe(false)
    expect(componentName.safeParse({ name: 'la bouche' }).success).toBe(true)
  })
})

describe('a part the curriculum draws', () => {
  // Fifteen carry no character. Their artwork is the source's and is neither fetched nor read, so what
  // the model is given instead is the characters the part builds and the strokes those share, both of
  // which are ours to read.
  const drawn = componentNameRequest(prefix(), {
    character: null,
    composes: ['輸', '諭', '癒', '愉'],
    shape: ['兪', '月'],
  })

  it('shows the strokes the characters it builds share', () => {
    expect(JSON.stringify(drawn.messages)).toContain('<shared>兪</shared>')
  })

  it('carries no part, there being no character to carry', () => {
    expect(JSON.stringify(drawn.messages)).not.toContain('<part>')
  })

  it('says the characters stand in for the part where the course draws it', () => {
    expect(prefix()).toContain('Where the course draws the part instead of writing it, no part is given')
  })

  // A part named after what one of its characters means makes a story saying the thing is made of
  // itself: 段 means steps, and a part called les marches turns its mnemonic into steps and a club
  // making steps. The name has to be what the shape looks like, and the prompt has to say so.
  it('refuses a name taken from what a character it builds means', () => {
    expect(prefix()).toContain('Never name the part after what one of those characters means')
  })
})

describe('readComponentName', () => {
  it('reads the name out of an answer shaped the way it was asked for', () => {
    expect(readComponentName('{"name":"la bouche"}')).toBe('la bouche')
  })

  // One entry lost is not a run lost: the component keeps no name and the next run asks again. It has
  // to be told apart from an answer, though, or a run reports names it never got.
  it('gives nothing back for an answer it cannot read', () => {
    expect(readComponentName('la bouche')).toBeNull()
    expect(readComponentName('{"name":')).toBeNull()
    expect(readComponentName('{"name":"la bouche","why":"because"}')).toBeNull()
    expect(readComponentName('{"nom":"la bouche"}')).toBeNull()
    expect(readComponentName('')).toBeNull()
  })
})
