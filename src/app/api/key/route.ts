import { accountCookie, clearedAccountCookie, clearedKeyCookie, keyCookie } from '@/data/key-cookie'
import { env } from '@/data/env'
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

const asked = { 'cache-control': 'no-store' }

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null)
  const key = typeof body === 'object' && body !== null && 'key' in body ? body.key : null

  if (typeof key !== 'string' || key.trim() === '') {
    return Response.json({ error: 'no key' }, { status: MALFORMED, headers: asked })
  }

  const reader = await wanikaniSource(key.trim(), env.WANIKANI_API)
    .reader()
    .catch(() => null)

  if (reader === null) return Response.json({ error: 'refused' }, { status: REFUSED, headers: asked })

  const held = { username: reader.username, level: reader.level }
  const answer = Response.json(
    { ...held, granted: reader.granted, subscribed: reader.subscribed },
    { headers: asked },
  )

  answer.headers.append('set-cookie', keyCookie(key.trim()))
  answer.headers.append('set-cookie', accountCookie(held))

  return answer
}

// Signing out. It answers the same whether a key was held or not: what it reports is the state
// afterwards, and there is nothing else to say.
export function DELETE(): Response {
  const answer = Response.json({ signedOut: true }, { headers: asked })

  answer.headers.append('set-cookie', clearedKeyCookie())
  answer.headers.append('set-cookie', clearedAccountCookie())

  return answer
}
