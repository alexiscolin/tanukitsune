import { forgetReader } from '@/data/review-events'
import { readerHeld } from '@/data/reader-key'
import { holdsSecret } from '@/data/sync-secret'

// Where a reader takes their history back. Everything written under the account their key names, gone,
// and nothing else: the deployment's own rows are not reachable from here, which is what an empty
// reader means in the table.
//
// It says how many rows it removed, because a deletion that answers nothing is a deletion nobody can
// tell from a failure. There is no second channel to confirm through: the product knows nothing about
// somebody but the account their key named, so there is nobody to write to.
export async function DELETE(request: Request): Promise<Response> {
  if (!holdsSecret(request)) return new Response(null, { status: 401 })

  const reader = await readerHeld()
  if (reader === null) return new Response(null, { status: 401 })

  return Response.json({ removed: await forgetReader(reader) }, { headers: { 'cache-control': 'no-store' } })
}
