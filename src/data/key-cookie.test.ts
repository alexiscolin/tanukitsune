import { describe, expect, it } from 'vitest'

import { READER_KEY_COOKIE } from '@/core/routes'

import { cookie } from './cookie'
import { clearedKeyCookie, keyCookie, keyOn } from './key-cookie'

const asked = (held: string) => new Request('https://example.test/', { headers: { cookie: held } })

describe('keyCookie', () => {
  // The three attributes are the whole of what keeps a credential out of reach: out of script, out of
  // another site's requests, and off the wire in clear.
  it('keeps the key out of script, off another site and off the wire', () => {
    const set = keyCookie('7d8f-not-a-real-key')

    expect(set).toContain('HttpOnly')
    expect(set).toContain('SameSite=Strict')
    expect(set).toContain('Secure')
    expect(set).toContain('Path=/')
  })

  it('writes a key a cookie header cannot carry as written', () => {
    expect(keyCookie('a key; with, separators')).toContain(encodeURIComponent('a key; with, separators'))
  })

  it('is read back as it was written', () => {
    expect(keyOn(asked(keyCookie('a key; with, separators').split(';')[0] ?? ''))).toBe('a key; with, separators')
  })

  it('reads nothing where a request carries no key', () => {
    expect(keyOn(asked(`${READER_KEY_COOKIE}x=other`))).toBeUndefined()
    expect(keyOn(new Request('https://example.test/'))).toBeUndefined()
  })
})

describe('clearedKeyCookie', () => {
  // Signing out is the cookie expiring, since the server holds nothing to forget.
  it('expires the cookie and carries no key', () => {
    const cleared = clearedKeyCookie()

    expect(cleared).toContain('Max-Age=0')
    expect(cleared.startsWith(`${READER_KEY_COOKIE}=;`)).toBe(true)
  })
})

describe('cookie', () => {
  it('reads a value holding the character it is split on', () => {
    expect(cookie(asked('name=a=b'), 'name')).toBe('a=b')
  })
})
