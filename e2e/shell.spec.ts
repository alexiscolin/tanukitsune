import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test('the bare root sends the reader to a locale', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/fr$/)
})

test('the page declares the locale it is written in', async ({ page }) => {
  await page.goto('/fr')

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
})

test('a locale the route tree does not serve is not found', async ({ page }) => {
  const response = await page.goto('/de')

  expect(response?.status()).toBe(404)
})

// The accessibility gate. There is no lint rule for it here, so this is the only
// thing standing between a violation and production. One helper, so the two
// pages cannot end up audited against different rules.
async function expectNoViolations(page: Page, path: string) {
  await page.goto(path)

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()

  expect(violations.map((violation) => violation.id)).toEqual([])
}

test('the page has no accessibility violations', async ({ page }) => {
  await expectNoViolations(page, '/fr')
})

test('health reports the build, reaches the database, and is never cached', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  expect(await response.json()).toMatchObject({
    database: 'reachable',
    // CI runs this against a server Postgres and a developer runs it against the
    // local file store. What the endpoint owes either of them is the truth about
    // which one answered, not a fixed value.
    driver: process.env['DATABASE_URL'] === undefined ? 'local-file' : 'postgres',
  })
})

test('the not-found page is accessible too', async ({ page }) => {
  await expectNoViolations(page, '/de')
})
