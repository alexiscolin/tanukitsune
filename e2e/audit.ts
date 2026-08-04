import AxeBuilder from '@axe-core/playwright'
import { type Page } from '@playwright/test'

// One rule list in one place, so the routes and the catalogue cannot end up audited against
// different ones. There is no lint rule for any of this, so these two suites are all that
// stands between a violation and production.
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// The ids rather than the assertion, so each suite keeps its own: a shared helper that
// asserted would move the check out of the file the test strength gate counts, and a
// check that moved reads there exactly like a check that was deleted.
// Axe reads the frame it is handed, and the entrance vocabulary of this interface is a fade:
// a screen audited mid-drift reports the contrast of text that is still arriving, which is a
// measurement of the animation rather than of the screen. Waited for here rather than in each
// suite, so no route or story can be audited on a frame nobody reads.
//
// Two never settle and are excluded by their own count: the dot that pulses while a session
// runs and the one that breathes on a card with something left to reveal. A rejection is an
// animation React cancelled by replacing the node under it, which is a frame that no longer
// exists rather than one to wait for.
async function settled(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => null)),
    ),
  )
}

export async function violationsOn(page: Page): Promise<string[]> {
  await settled(page)

  const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze()

  return violations.map((violation) => violation.id)
}
