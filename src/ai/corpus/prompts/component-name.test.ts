import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { describe, expect, it } from 'vitest'

import { componentName, componentNamePrefix, componentNameRequest } from './component-name'

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
    expect(componentNameRequest(prefix(), { character: '九', composes: ['丸'] }).model).toBe('claude-opus-5')
    expect(componentName.safeParse({ name: 'la bouche', why: 'because' }).success).toBe(false)
    expect(componentName.safeParse({ name: 'la bouche' }).success).toBe(true)
  })
})
