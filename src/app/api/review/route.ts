import { BACKUP_SECRET_HEADER } from '@/core/routes'

// The flush is a route handler taking a batch rather than a server action, for the reasons in
// docs/framing.md under mutation transport: forty queued answers would otherwise become forty
// serialised round trips through an identifier that rotates on deploy, which is exactly what a
// client returning from offline no longer has.

export function POST(request: Request): Response {
  void request.headers.get(BACKUP_SECRET_HEADER)

  return new Response(null, { status: 401 })
}
