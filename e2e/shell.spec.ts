import { expect, test, type Page } from '@playwright/test'

import { asOptional } from '../src/data/optional-text'
import { violationsOn } from './audit'

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

async function expectPathClean(page: Page, path: string) {
  await page.goto(path)

  expect(await violationsOn(page)).toEqual([])
}

test('the page has no accessibility violations', async ({ page }) => {
  await expectPathClean(page, '/fr')
})

test('health reports the build, reaches the database, and is never cached', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  expect(await response.json()).toMatchObject({
    database: 'reachable',
    // CI runs this against a server Postgres and a developer runs it against the
    // local file store. What the endpoint owes either of them is the truth about
    // which one answered, not a fixed value. Read through the rule the application
    // and the migration tool read it by, rather than a third opinion about the
    // variable, since three readings of one value is what this branch exists on.
    driver: asOptional(process.env['DATABASE_URL']) === undefined ? 'local-file' : 'postgres',
  })
})

test('the not-found page is accessible too', async ({ page }) => {
  await expectPathClean(page, '/de')
})
