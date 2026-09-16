import { forgetReader } from '@/data/review-events'
import { readerHeld } from '@/data/reader-key'

// Where a reader takes their history back. Everything written under the account their key names, gone,
// and nothing else: the deployment's own rows are not reachable from here, which is what an empty
// reader means in the table.
//
// It says how many rows it removed, because a deletion that answers nothing is a deletion nobody can
// tell from a failure. There is no second channel to confirm through: the product knows nothing about
// somebody but the account their key named, so there is nobody to write to.
export async function DELETE(request: Request): Promise<Response> {
  const origin = request.headers.get('origin')
  if (origin === null || origin !== new URL(request.url).origin) return new Response(null, { status: 401 })

  // The signature is the authorisation: only this deployment can write one, and it names the account
  // whose rows go. The backup secret is not asked for, since it is handed to every browser and the
  // control that reaches this lives on the screen a reader lands on before any session.
  const reader = await readerHeld()
  if (reader === null) return new Response(null, { status: 401 })

  return Response.json({ removed: await forgetReader(reader) }, { headers: { 'cache-control': 'no-store' } })
}
