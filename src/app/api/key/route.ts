import {
  accountCookie,
  clearedAccountCookie,
  clearedKeyCookie,
  clearedSubmitsCookie,
  keyCookie,
  submitsCookie,
} from '@/data/key-cookie'
import { env } from '@/data/env'
import { sameOrigin } from '@/data/same-origin'
import { accountHeld, submitsHeld } from '@/data/reader-key'
import { wanikaniSource } from '@/data/wanikani/source'

// Where a reader hands their WaniKani key over. The key is checked by using it: the account endpoint
// answers for the key itself, so a typo is told from a working key without this route knowing anything
// about their format.
//
// What comes back names the account, so the screen can say whose it is. The key itself is never
// answered back, never logged and never written down: it goes into the cookie and nowhere else, per
// docs/decisions/0017-a-key-lives-in-a-cookie.md.
const REFUSED = 401
const MALFORMED = 400

// Nothing here is a document and none of it is anybody else's: an account named on one browser must not
// be handed to the next from a cache.
const asked = { 'cache-control': 'no-store' }

export async function GET(): Promise<Response> {
  const held = await accountHeld()

  return Response.json(
    held === null ? { held: null } : { held: { username: held.username, level: held.level }, submits: await submitsHeld() },
    { headers: asked },
  )
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return new Response(null, { status: REFUSED })

  const body: unknown = await request.json().catch(() => null)
  const key = typeof body === 'object' && body !== null && 'key' in body ? body.key : null

  if (typeof key !== 'string' || key.trim() === '') {
    return Response.json({ error: 'no key' }, { status: MALFORMED, headers: asked })
  }

  const reader = await wanikaniSource(key.trim(), env.WANIKANI_API)
    .reader()
    .catch(() => null)

  if (reader === null) return Response.json({ error: 'refused' }, { status: REFUSED, headers: asked })

  const held = { id: reader.id, username: reader.username, level: reader.level }
  const answer = Response.json(
    { username: held.username, level: held.level, granted: reader.granted, subscribed: reader.subscribed },
    { headers: asked },
  )

  answer.headers.append('set-cookie', keyCookie(key.trim()))
  answer.headers.append('set-cookie', accountCookie(held, env.TANUKITSUNE_READER_SECRET))
  answer.headers.append('set-cookie', submitsCookie(true, env.TANUKITSUNE_READER_SECRET))

  return answer
}

// The switch, which is the one thing a reader changes after handing a key over. Signed like the account,
// so a browser cannot turn somebody else's sending on.
export function PATCH(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return Promise.resolve(new Response(null, { status: REFUSED }))

  return request
    .json()
    .catch(() => null)
    .then((body: unknown) => {
      const submits = typeof body === 'object' && body !== null && 'submits' in body ? body.submits : null
      if (typeof submits !== 'boolean') {
        return Response.json({ error: 'no choice' }, { status: MALFORMED, headers: asked })
      }

      const answer = Response.json({ submits }, { headers: asked })
      answer.headers.append('set-cookie', submitsCookie(submits, env.TANUKITSUNE_READER_SECRET))

      return answer
    })
}

// Signing out. It answers the same whether a key was held or not: what it reports is the state
// afterwards, and there is nothing else to say.
export function DELETE(request: Request): Response {
  if (!sameOrigin(request)) return new Response(null, { status: REFUSED })

  const answer = Response.json({ signedOut: true }, { headers: asked })

  answer.headers.append('set-cookie', clearedKeyCookie())
  answer.headers.append('set-cookie', clearedAccountCookie())
  answer.headers.append('set-cookie', clearedSubmitsCookie())

  return answer
}
