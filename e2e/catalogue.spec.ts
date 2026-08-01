import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { catalogueURL } from '../playwright.config'

// The states of a review are catalogued and nothing ran them: the audit the addon performs
// answers to a person opening a browser. This is what runs them. Every story is visited in
// both themes, which is where a token decided in a design session changes a contrast
// without changing a word of markup.
const AUDITED = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// docs/decisions/0009-storybook-as-the-review-surface.md says states are reached by driving
// rather than by posing, so a story is not done when it renders: its play function is still
// typing. Storybook announces the end on its own channel and names a thrown play separately,
// which is the only signal separating a state that arrived from one that stalled.
//
// Installed before navigation rather than after, because the story can finish before an
// evaluated listener would attach, and a listener that missed the event waits for one that
// already happened. The channel does not exist when this runs, so it is polled for.
const RECORD_OUTCOME = `
  window.__storyOutcome = undefined
  const attach = () => {
    const channel = window.__STORYBOOK_ADDONS_CHANNEL__
    if (channel === undefined) return setTimeout(attach, 10)
    channel.once('playFunctionThrewException', (error) => {
      window.__storyOutcome = 'play threw: ' + (error?.message ?? JSON.stringify(error))
    })
    channel.once('storyFinished', () => {
      window.__storyOutcome = window.__storyOutcome ?? 'finished'
    })
  }
  attach()
`

async function catalogued(page: Page): Promise<string[]> {
  const response = await page.request.get(`${catalogueURL}/index.json`)
  expect(response.ok()).toBe(true)

  const index = (await response.json()) as {
    entries: Record<string, { id: string; type: string }>
  }

  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story')
    .map((entry) => entry.id)
}

for (const theme of ['light', 'dark'] as const) {
  test(`every catalogued state reaches itself and is audited in ${theme}`, async ({ page }) => {
    await page.addInitScript(RECORD_OUTCOME)

    const ids = await catalogued(page)
    // An empty catalogue passes every assertion below it. The count is the one thing a
    // renamed stories glob would silently take away.
    expect(ids.length).toBeGreaterThan(0)

    for (const id of ids) {
      await test.step(id, async () => {
        await page.goto(
          `${catalogueURL}/iframe.html?id=${id}&globals=theme:${theme}&viewMode=story`,
        )
        await page.waitForFunction('window.__storyOutcome !== undefined')

        expect(await page.evaluate('window.__storyOutcome')).toBe('finished')

        const { violations } = await new AxeBuilder({ page }).withTags(AUDITED).analyze()

        expect(violations.map((violation) => violation.id)).toEqual([])
      })
    }
  })
}
