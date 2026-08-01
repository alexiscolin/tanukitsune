import AxeBuilder from '@axe-core/playwright'
import { type Page } from '@playwright/test'

// One rule list in one place, so the routes and the catalogue cannot end up audited against
// different ones. There is no lint rule for any of this, so these two suites are all that
// stands between a violation and production.
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// The ids rather than the assertion, so each suite keeps its own: a shared helper that
// asserted would move the check out of the file the test strength gate counts, and a
// check that moved reads there exactly like a check that was deleted.
export async function violationsOn(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze()

  return violations.map((violation) => violation.id)
}
