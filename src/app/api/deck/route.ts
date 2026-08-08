import { dealtFor } from '@/app/[locale]/waiting'
import { isFlow } from '@/core/subject'

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

  return Response.json(await dealtFor(flow), { headers: { 'cache-control': 'no-store' } })
}
