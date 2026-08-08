import { due } from '@/app/[locale]/waiting'

// What is waiting, asked for by the screen rather than rendered into it. The counts are the
// reader's, so a document carrying them is a document per reader, and the service worker holds one
// shell for everyone: this is what keeps an account out of a cache on disk.
//
// The status this answers where the source did not is the one the deck route answers, for the same
// reason: the screen tells no answer from a route that broke.
const UNREACHED = 503

export async function GET(): Promise<Response> {
  const counted = await due().catch((reason: unknown) => {
    if (!(reason instanceof TypeError)) throw reason

    return null
  })

  const headers = { 'cache-control': 'no-store' }

  return counted === null
    ? new Response(null, { status: UNREACHED, headers })
    : Response.json(counted, { headers })
}
