import { defineConfig } from 'drizzle-kit'

// drizzle-kit loads .env, while pnpm bootstrap writes .env.local and next loads
// that. Without this, migrations run against a different database than the app.
try {
  process.loadEnvFile('.env.local')
} catch {
  // Absent before the first bootstrap, which is not an error.
}

// Empty means absent, the same rule src/data/env.ts parses the application's
// environment by. This file cannot import it, since that module is server-only
// and parses everything, so the rule is held here rather than shared.
const url = process.env['DATABASE_URL'] || undefined

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
