import 'server-only'

import { cookies } from 'next/headers'

import { z } from 'zod'

import { READER_ACCOUNT_COOKIE, READER_KEY_COOKIE, READER_SUBMITS_COOKIE } from '@/core/routes'
import type { Held } from './key-cookie'

import { env } from './env'
import { unsealed } from './reader-seal'

const account = z.object({ id: z.string().min(1), username: z.string().min(1), level: z.number() })

// Which WaniKani key this request reviews with: the one the reader handed over, and the deployment's
// own where there is none. A deployment holding a token is the author's single-user one, which
// docs/specs/v0.1.md describes and v0.2 does not take away.
//
// Read per request and never cached: two readers share one server, and a key kept between requests is
// the one mistake that would deal an account to somebody else.
export async function keyHeld(): Promise<string | undefined> {
  return (await cookies()).get(READER_KEY_COOKIE)?.value ?? env.WANIKANI_TOKEN
}

// Whose key this browser holds, for the screen that says so. Read from the cookie signature where there
// is one and from the cookie itself where the deployment signs nothing: what a screen names is a name,
// and a deployment that signs nothing accepts no writes to attribute.
export async function accountHeld(): Promise<Held | null> {
  const written = await held(READER_ACCOUNT_COOKIE)
  if (written === undefined) return null

  const verified = unsealed(written, env.TANUKITSUNE_SYNC_SECRET)

  return read(verified ?? written)
}

// Which reader a row is written under, and nothing where the account cannot be believed: an unsigned
// cookie names nobody, so the row belongs to the deployment's own account the way every row did before
// keys existed.
export async function readerHeld(): Promise<string | null> {
  return read(unsealed(await held(READER_ACCOUNT_COOKIE), env.TANUKITSUNE_SYNC_SECRET))?.id ?? null
}

// Whether this reader's answers may be sent on, which is what the append stamps on every row it writes.
// On unless the reader turned it off: a signature that does not fall out right is read as no choice
// rather than as off, and no choice is the product doing what it says on the screen.
export async function submitsHeld(): Promise<boolean> {
  return unsealed(await held(READER_SUBMITS_COOKIE), env.TANUKITSUNE_SYNC_SECRET) !== 'false'
}

// Percent-decoded, matching how it was written: the framework hands the value back as it sits in the
// header, and a cookie is written encoded because its value may hold a character a header cannot carry.
async function held(name: string): Promise<string | undefined> {
  const written = (await cookies()).get(name)?.value
  if (written === undefined) return undefined

  try {
    return decodeURIComponent(written)
  } catch {
    // Not something this ever wrote, so it names nobody whatever it is.
    return undefined
  }
}

function read(written: string | null): Held | null {
  if (written === null) return null

  try {
    return account.safeParse(JSON.parse(written)).data ?? null
  } catch {
    return null
  }
}
