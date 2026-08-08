import { dealtFor } from '@/app/[locale]/waiting'
import { isFlow } from '@/core/subject'
import { secretCookie } from '@/data/sync-secret'

// What this answers where the source did not. Distinct from a five hundred, which says this route
// broke: the screen deals from the device on the first and raises the second.
const UNREACHED = 503

// What a sitting is, asked for by the screen rather than rendered into it. The token is the
// server's and stays here; what crosses is the same subjects the page used to carry in its own
// HTML, so the deployment exposes nothing it did not already.
//
// Moving it off the render is what lets one document be the application shell: a page carrying the
// reader's deck is a page per reader, and a shell has to be the same for everyone before a cache
// can hold it.

export async function GET(request: Request): Promise<Response> {
  const flow = new URL(request.url).searchParams.get('flow')

  // A flow nobody named is not found rather than guessed, which is the rule the screen follows.
  if (flow === null || !isFlow(flow)) return new Response(null, { status: 404 })

  // No answer from the source is not a defect, it is the case the device holds a sitting for, and
  // the screen has to tell it from a route that broke. A refusal is an answer and stays a defect:
  // it reaches the caller as the five hundred it is.
  const sitting = await dealtFor(flow).catch((reason: unknown) => {
    if (!(reason instanceof TypeError)) throw reason

    return null
  })

  if (sitting === null) return new Response(null, { status: UNREACHED })

  const held = secretCookie()

  // Set here because a screen asks for its sitting before it can answer anything, so the cookie is
  // in place before the first row reaches the queue. A server component cannot set one, and this is
  // the only call every session makes.
  return Response.json(sitting, {
    headers: {
      'cache-control': 'no-store',
      ...(held === null ? {} : { 'set-cookie': held }),
    },
  })
}
