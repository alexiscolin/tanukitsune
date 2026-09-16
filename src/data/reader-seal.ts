import { createHmac, timingSafeEqual } from 'node:crypto'

// Who a request says it is, and whether that can be believed. A cookie is written by us and sent back
// by the browser, so anything a reader could edit is a claim rather than a fact: the account a row is
// written under is signed here, and a cookie whose signature does not fall out right is read as no
// account at all.
//
// Signed with the secret the backup route already requires, since a deployment that holds none accepts
// no writes anyway: there is nothing to attribute where nothing can be written. The secret is handed in
// rather than read here, which is what lets the rule be tested at all.

const SEPARATOR = '.'

function signature(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

// Constant time, the way the secret itself is compared: a signature checked with an early exit tells a
// caller how much of their guess was right.
function matches(given: string, expected: string): boolean {
  const one = Buffer.from(given)
  const other = Buffer.from(expected)

  return one.length === other.length && timingSafeEqual(one, other)
}

export function sealed(value: string, secret: string | undefined): string | null {
  return secret === undefined ? null : `${value}${SEPARATOR}${signature(value, secret)}`
}

export function unsealed(text: string | undefined, secret: string | undefined): string | null {
  if (text === undefined || secret === undefined) return null

  const at = text.lastIndexOf(SEPARATOR)
  if (at === -1) return null

  const value = text.slice(0, at)

  return matches(text.slice(at + 1), signature(value, secret)) ? value : null
}
