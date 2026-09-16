import 'server-only'

import { cookies } from 'next/headers'

import { z } from 'zod'

import { READER_ACCOUNT_COOKIE, READER_KEY_COOKIE } from '@/core/routes'
import type { Held } from './key-cookie'

import { env } from './env'

const account = z.object({ username: z.string().min(1), level: z.number() })

// Which WaniKani key this request reviews with: the one the reader handed over, and the deployment's
// own where there is none. A deployment holding a token is the author's single-user one, which
// docs/specs/v0.1.md describes and v0.2 does not take away.
//
// Read per request and never cached: two readers share one server, and a key kept between requests is
// the one mistake that would deal an account to somebody else.
export async function keyHeld(): Promise<string | undefined> {
  return (await cookies()).get(READER_KEY_COOKIE)?.value ?? env.WANIKANI_TOKEN
}

// Whose key this browser holds, for the screen that says so. Nothing depends on it being right: it is
// what the route wrote when the key worked, and the key itself is what every read is made with.
export async function accountHeld(): Promise<Held | null> {
  const written = (await cookies()).get(READER_ACCOUNT_COOKIE)?.value
  if (written === undefined) return null

  const read: unknown = JSON.parse(written)

  return account.safeParse(read).data ?? null
}
