import { defineConfig } from 'drizzle-kit'

import { LOCAL_DATA_DIR, LOCAL_DATA_DIR_VARIABLE } from './src/data/local-data-dir'
import { asOptional } from './src/data/optional-text'

// drizzle-kit loads .env, while pnpm bootstrap writes .env.local and next loads
// that. Without this, migrations run against a different database than the app.
try {
  process.loadEnvFile('.env.local')
} catch {
  // Absent before the first bootstrap, which is not an error.
}

const url = asOptional(process.env['DATABASE_URL'])

// The same variable and the same default src/data/db.ts reads, from the module that owns both,
// because migrating one directory while the application opens another is the failure the comment
// above warns about, one level down.
const local = asOptional(process.env[LOCAL_DATA_DIR_VARIABLE]) ?? LOCAL_DATA_DIR

// Mirrors the driver choice in src/data/db.ts: a server Postgres when the
// environment names one, the local file-backed database otherwise.
export default defineConfig(
  url === undefined
    ? {
        schema: './src/data/schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        driver: 'pglite',
        dbCredentials: { url: local },
      }
    : {
        schema: './src/data/schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        dbCredentials: { url },
      },
)
