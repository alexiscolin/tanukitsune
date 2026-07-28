import { currentBuild } from '@/data/build-info'
import { activeDriver, isReachable } from '@/data/db'

export async function GET(): Promise<Response> {
  const reachable = await isReachable()

  return Response.json(
    {
      ...currentBuild(),
      database: reachable ? 'reachable' : 'unreachable',
      driver: activeDriver(),
    },
    {
      status: reachable ? 200 : 503,
      // A cached health check reports the last outage it saw, which is the one
      // thing this endpoint must never do.
      headers: { 'cache-control': 'no-store' },
    },
  )
}
