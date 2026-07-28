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

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: process.env['CI'] === undefined ? 'list' : 'github',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  // Against the production build, because the offline paths this suite exists to
  // cover behave differently under the development server.
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 180_000,
  },
})
