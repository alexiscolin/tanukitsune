import { defineConfig, devices } from '@playwright/test'

// The runner asserts on which driver answered, so it has to read the same file
// the server under test reads.
try {
  process.loadEnvFile('.env.local')
} catch {
  // Absent in CI, which sets the environment directly.
}

const PORT = 3117
const baseURL = `http://127.0.0.1:${PORT}`

// Fixed rather than random, a server reused across runs having been started with whatever this
// was the first time. It guards a route against the internet, not against this suite.
const SYNC_SECRET = 'end-to-end-sync-secret'
process.env['TANUKITSUNE_SYNC_SECRET'] = SYNC_SECRET

// The catalogue answers on its own port, so a spec reaches a story by absolute URL while
// every other spec keeps resolving against the application.
const CATALOGUE_PORT = 6017
export const catalogueURL = `http://127.0.0.1:${CATALOGUE_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: process.env['CI'] === undefined ? 'list' : 'github',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: [
    // Against the production build, because the offline paths this suite exists to
    // cover behave differently under the development server.
    {
      command: `pnpm build && pnpm start -p ${PORT}`,
      url: baseURL,
      // Demo mode for the server this file starts: with a token it deals whoever's account the
      // machine happens to hold, and a suite that asserts what is waiting would then pass or fail
      // on somebody's study day. Empty rather than absent, because a variable already set is what
      // stops the environment file from putting the real one back. A server already answering on
      // this port is reused as it is, so one started by hand with a token is one the suite runs
      // against.
      // The backup route is closed without a secret, so the server under test is started with
      // one and the suite reads the same variable rather than repeating its value.
      env: { WANIKANI_TOKEN: '', TANUKITSUNE_SYNC_SECRET: SYNC_SECRET },
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 180_000,
    },
    // The catalogue is served by its development server rather than built first: what the
    // story spec asks of it is that each state still reaches itself and still passes the
    // audit, and neither answer changes between the two.
    {
      // The binary rather than the pnpm script, which carries a port of its own: passing a
      // second one leaves the suite depending on which of the two the parser keeps.
      command: `pnpm exec storybook dev --no-open --quiet -p ${CATALOGUE_PORT}`,
      url: `${catalogueURL}/index.json`,
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 180_000,
    },
  ],
})
