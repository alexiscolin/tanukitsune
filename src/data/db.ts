import 'server-only'

import { sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { env } from './env'
import { LOCAL_DATA_DIR } from './local-data-dir'
import * as schema from './schema'

type Database = PgDatabase<PgQueryResultHKT, typeof schema>



// A server Postgres when the environment names one, the local file-backed
// database otherwise, which is what lets a fresh clone run with nothing
// installed. Imported dynamically so the local driver never reaches a
// production bundle.
let connection: Promise<Database> | undefined

// Exported for the modules that write, which reach the connection rather than opening one: two
// pools against one database is the outage a serverless ceiling is counted per instance to avoid.
export function db(): Promise<Database> {
  // A failed connection is not memoised. Caching the rejected promise would turn
  // one transient outage into a permanently broken process.
  connection ??= connect().catch((reason: unknown) => {
    connection = undefined
    throw reason
  })
  return connection
}

async function connect(): Promise<Database> {
  if (env.DATABASE_URL !== undefined) {
    const [{ Pool }, { drizzle }] = await Promise.all([
      import('pg'),
      import('drizzle-orm/node-postgres'),
    ])
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      // Every serverless instance opens its own pool, so the ceiling is per
      // instance rather than per application. Small, and closed quickly.
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
    return drizzle(pool, { schema })
  }

  const [{ PGlite }, { drizzle }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ])
  // Configurable because pglite is one process over one directory: two servers sharing it abort
  // each other's queries, and the end-to-end suite runs two. A deployment names a server database
  // instead and never reaches this line.
  return drizzle(new PGlite(env.TANUKITSUNE_LOCAL_DATABASE ?? LOCAL_DATA_DIR), { schema })
}

// Which database answered, not only whether one did. A deployment that lost its
// connection string opens the local file store, serves an empty schema and
// passes every reachability check; naming the driver is what makes that visible
// from outside rather than after the data is gone.
export type DatabaseDriver = 'postgres' | 'local-file'

export function activeDriver(): DatabaseDriver {
  return env.DATABASE_URL === undefined ? 'local-file' : 'postgres'
}

export async function isReachable(): Promise<boolean> {
  try {
    await (await db()).execute(sql`select 1`)
    return true
  } catch {
    return false
  }
}
