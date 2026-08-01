import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// One rule list in one place, so the routes and the catalogue cannot end up audited against
// different ones. There is no lint rule for any of this, so these two suites are all that
// stands between a violation and production.
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze()

  expect(violations.map((violation) => violation.id)).toEqual([])
}
