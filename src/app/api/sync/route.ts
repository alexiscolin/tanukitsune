import { secretCookie } from '@/data/sync-cookie'

// Where the queue asks for the right to post. It answers nothing and exists for its header: the
// secret is the deployment's, the browser keeps it where no script can read it, and this is the one
// response that hands it over.
//
// A route rather than the document, because the service worker holds documents on disk and a header
// on a held document is the secret back where moving it out of the page was meant to take it from.
// Asked by the drain rather than by a screen, because the drain is what needs it and a deployment
// serving the seeded deck asks for no deck at all.
const NOTHING = 204

export function GET(): Response {
  const held = secretCookie()

  return new Response(null, {
    status: NOTHING,
    headers: { 'cache-control': 'no-store', ...(held === null ? {} : { 'set-cookie': held }) },
  })
}
