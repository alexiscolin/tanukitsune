import 'server-only'

import { cookies } from 'next/headers'

import { z } from 'zod'

import { READER_ACCOUNT_COOKIE, READER_KEY_COOKIE, READER_SUBMITS_COOKIE } from '@/core/routes'
import type { Held } from './key-cookie'

import { decoded } from './cookie'
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
  return (await keyHanded()) ?? env.WANIKANI_TOKEN
}

// The key this browser handed over, and nothing where it handed none: what tells a reader's request
// from the deployment's own. A request carrying a key names a reader or it names nobody, and the two
// must be read together, a key belonging to one account and rows to another being the mix-up that would
// send one reader's history to somebody else.
export async function keyHanded(): Promise<string | undefined> {
  return held(READER_KEY_COOKIE)
}

// Whose key this browser holds, for the screen that says so. Only what the signature carries: an account
// read off an unsigned cookie is a name a browser chose, and a screen naming it would say somebody is
// signed in as somebody else.
export async function accountHeld(): Promise<Held | null> {
  return read(unsealed(await held(READER_ACCOUNT_COOKIE), env.TANUKITSUNE_READER_SECRET))
}

// Which reader a row is written under, and nothing where the account cannot be believed: an unsigned
// cookie names nobody, so the row belongs to the deployment's own account the way every row did before
// keys existed.
export async function readerHeld(): Promise<string | null> {
  return read(unsealed(await held(READER_ACCOUNT_COOKIE), env.TANUKITSUNE_READER_SECRET))?.id ?? null
}

// Whether this reader's answers may be sent on. Only a signature that falls out right sends: a cookie
// nobody can verify is not a reader asking for their account to be advanced, and a submission is
// irreversible. A deployment rotating its secret stops sending rather than starting.
export async function submitsHeld(): Promise<boolean> {
  return unsealed(await held(READER_SUBMITS_COOKIE), env.TANUKITSUNE_READER_SECRET) === 'true'
}

// The framework hands the value back as it sits in the header, and a cookie is written encoded because
// its value may hold a character a header cannot carry.
async function held(name: string): Promise<string | undefined> {
  return decoded((await cookies()).get(name)?.value)
}

function read(written: string | null): Held | null {
  if (written === null) return null

  try {
    return account.safeParse(JSON.parse(written)).data ?? null
  } catch {
    return null
  }
}
