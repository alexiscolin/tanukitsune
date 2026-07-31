import { defineConfig } from 'drizzle-kit'

import { asOptional } from './src/data/optional-text'

// drizzle-kit loads .env, while pnpm bootstrap writes .env.local and next loads
// that. Without this, migrations run against a different database than the app.
try {
  process.loadEnvFile('.env.local')
} catch {
  // Absent before the first bootstrap, which is not an error.
}

const url = asOptional(process.env['DATABASE_URL'])

// Mirrors the driver choice in src/data/db.ts: a server Postgres when the
// environment names one, the local file-backed database otherwise.
export default defineConfig(
  url === undefined
    ? {
        schema: './src/data/schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        driver: 'pglite',
        dbCredentials: { url: '.postgres' },
      }
    : {
        schema: './src/data/schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        dbCredentials: { url },
      },
)
