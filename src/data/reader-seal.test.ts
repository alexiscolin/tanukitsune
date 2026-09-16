import { describe, expect, it } from 'vitest'

import { sealed, unsealed } from './reader-seal'

const SECRET = 'a-deployment-secret'

describe('sealed', () => {
  it('reads back what it signed', () => {
    expect(unsealed(sealed('reader-1', SECRET) ?? undefined, SECRET)).toBe('reader-1')
  })

  // The whole point: a cookie is written by us and handed back by the browser, so a value somebody
  // edited has to read as no account rather than as the account they typed.
  it('reads an edited value as no account at all', () => {
    const seal = sealed('reader-1', SECRET) ?? ''

    expect(unsealed(seal.replace('reader-1', 'reader-2'), SECRET)).toBeNull()
    expect(unsealed('reader-1.not-a-signature', SECRET)).toBeNull()
    expect(unsealed('reader-1', SECRET)).toBeNull()
  })

  it('reads a value signed with another secret as no account', () => {
    expect(unsealed(sealed('reader-1', 'another secret') ?? undefined, SECRET)).toBeNull()
  })

  // A value may hold the separator, and the signature is what follows the last one.
  it('carries a value holding the character it is joined with', () => {
    const held = '{"id":"1.2","username":"a.b"}'

    expect(unsealed(sealed(held, SECRET) ?? undefined, SECRET)).toBe(held)
  })

  // A deployment with no secret writes nothing, so it signs nothing and believes nothing.
  it('signs nothing and believes nothing where the deployment holds no secret', () => {
    expect(sealed('reader-1', undefined)).toBeNull()
    expect(unsealed('reader-1.whatever', undefined)).toBeNull()
  })
})
