import { describe, expect, it } from 'vitest'

import { asOptional } from './optional-text'

describe('asOptional', () => {
  // The case that broke a fresh clone: `.env.example` assigned nothing, the file was
  // copied as the local environment, and a reader testing against undefined alone
  // concluded a server was configured.
  it('reads an assignment with nothing after it as no assignment', () => {
    expect(asOptional('')).toBeUndefined()
  })

  it('reads an absent variable as absent', () => {
    expect(asOptional(undefined)).toBeUndefined()
  })

  it('leaves a value alone, spaces included, since a path may end in one', () => {
    expect(asOptional('postgres://localhost/x')).toBe('postgres://localhost/x')
    expect(asOptional(' ')).toBe(' ')
  })
})
