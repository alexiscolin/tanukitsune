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
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 180_000,
    },
    // The catalogue is served by its development server rather than built first: what the
    // story spec asks of it is that each state still reaches itself and still passes the
    // audit, and neither answer changes between the two.
    {
      command: `pnpm storybook --no-open -p ${CATALOGUE_PORT} --quiet`,
      url: `${catalogueURL}/index.json`,
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 180_000,
    },
  ],
})
