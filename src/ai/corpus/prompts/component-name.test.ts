import { describe, expect, it } from 'vitest'

import { componentName, componentNameRequest } from './component-name'

const TAKEN = ['le soleil', 'la bouche', "l'arbre"]

function request(character: string, composes: readonly string[], traditional?: string) {
  return componentNameRequest(TAKEN, { character, composes, ...(traditional === undefined ? {} : { traditional }) })
}

describe('componentNameRequest', () => {
  // Everything identical across a run belongs in the cached prefix and everything that moves belongs
  // after it, or the prefix is rewritten per request and the cache never reads. This is the shape of
  // that, checked rather than assumed: the rules and the taken names above, the component below.
  it('puts what every request shares in the cached prefix and the component after it', () => {
    const asked = request('九', ['丸', '究'])
    const prefix = asked.system

    expect(Array.isArray(prefix) && prefix[0]?.cache_control).toEqual({ type: 'ephemeral' })
    expect(String(Array.isArray(prefix) ? prefix[0]?.text : '')).toContain('la bouche')
    expect(JSON.stringify(asked.messages)).toContain('九')
    expect(String(Array.isArray(prefix) ? prefix[0]?.text : '')).not.toContain('九')
  })

  // A byte moving in the prefix invalidates the cache for every request behind it, so the taken names
  // are sorted rather than left in whatever order a map yielded them.
  it('orders the taken names so the prefix is the same bytes every run', () => {
    const one = request('九', ['丸'])
    const other = componentNameRequest([...TAKEN].reverse(), { character: '九', composes: ['丸'] })

    expect(JSON.stringify(one.system)).toBe(JSON.stringify(other.system))
  })

  it('gives the model the kanji the component builds, which is what a name is judged on', () => {
    expect(JSON.stringify(request('九', ['丸', '究']).messages)).toContain('丸 究')
  })

  it('says so rather than inventing evidence when a component builds nothing', () => {
    expect(JSON.stringify(request('九', []).messages)).toContain('nothing on its own')
  })

  it('passes the traditional name through where one exists and omits the line where none does', () => {
    expect(JSON.stringify(request('九', ['丸'], 'nine'))).toContain('nine')
    expect(JSON.stringify(request('九', ['丸']))).not.toContain('traditionally')
  })

  it('asks for the pinned model and a shape strict enough to refuse an extra key', () => {
    expect(request('九', ['丸']).model).toBe('claude-opus-5')
    expect(componentName.safeParse({ name: 'la bouche', why: 'because' }).success).toBe(false)
    expect(componentName.safeParse({ name: 'la bouche' }).success).toBe(true)
  })
})
