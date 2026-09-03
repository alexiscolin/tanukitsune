// Which database a process opens: a server Postgres where the environment names one, the local
// file-backed store otherwise, which is what lets a fresh clone run with nothing installed.
//
// Apart from `db.ts` because a command is not a server. `db.ts` is server-only and holds the one
// connection the application shares; a corpus command runs once, writes and exits, and opening the
// same driver twice from two copies of this choice is how the two would drift.

import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema.ts'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

// Where to connect, handed in rather than read here: `env.ts` is server-only and a corpus command is
// not a server, so the two callers read their own environment and this decides nothing but the driver.
export type Opening = {
  readonly url: string | undefined
  readonly directory: string
}

export async function connect({ url, directory }: Opening): Promise<Database> {
  if (url !== undefined) {
    const [{ Pool }, { drizzle }] = await Promise.all([import('pg'), import('drizzle-orm/node-postgres')])
    const pool = new Pool({
      connectionString: url,
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

  // Configurable because this driver is one process over one directory, and the end-to-end suite
  // runs two servers. docs/verification.md carries the whole of it.
  return drizzle(new PGlite(directory), { schema })
}
