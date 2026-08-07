import { expect, test } from '@playwright/test'

import { deckFor } from '../src/core/review/deck'
import { questionsFor } from '../src/core/review/question'
import type { Question } from '../src/core/review/question'
import { FLUSH_PATH } from '../src/core/routes'
import { toAssignment, toSubject } from '../src/data/wanikani/payload'
import { accountURL, sourceURL } from '../playwright.config'
import { FAKE_REVIEWS, FAKE_SUBJECTS } from './fake-account'
import { copyFor } from '../src/core/site-copy'
import { asOptional } from '../src/data/optional-text'
import { answerQuestion } from './session'
import { sessionPath } from '../src/core/routes'

// Serial, and it has to be: every test here triggers a real flush against one account server, one
// database and one fake source, so two running at once would each send what the other had just
// backed up. What each asserts is what the source received, filtered to what that test caused,
// rather than a total the run beside it also moves.
test.describe.configure({ mode: 'serial' })

const COPY = copyFor('fr')

// The secret the server under test was started with, read rather than written twice: a literal here
// would pass against a server holding another value.
const SECRET = asOptional(process.env['TANUKITSUNE_SYNC_SECRET']) ?? ''

// The flush, end to end and against a source that belongs to nobody: a session is answered, the
// queue is backed up, and what the backup holds reaches the source. It runs on the account server
// alone, the seeded deck belonging to no assignment and so being held back rather than sent.

// What the account server deals, worked out the way the route works it out, so a change to either
// rule moves both rather than leaving the spec asserting an order the product stopped dealing.
function dealt(): readonly Question[] {
  const waiting = FAKE_REVIEWS.data.map(toAssignment)
  const held = new Set(waiting.map((entry) => entry.subjectId))
  // No components folded in: what a question needs is the meanings and the readings, and a card's
  // relations are not asked about.
  const subjects = FAKE_SUBJECTS.data
    .filter((entry) => held.has(entry.id))
    .map((entry) => toSubject(entry, new Map()))

  return questionsFor(deckFor(waiting, subjects))
}

// Every submission the fake has been sent, which is where the criterion lives: what must not happen
// twice is the call leaving the suite, and no assertion against our own tables can see that.
type Taken = { review: { assignment_id: number } }

async function taken(request: {
  get: (url: string) => Promise<{ json: () => Promise<unknown> }>
}): Promise<readonly Taken[]> {
  const body = (await (await request.get(`${sourceURL}/taken`)).json()) as { taken: Taken[] }

  return body.taken
}

// The assignments named since a mark, which is what a test caused: the fake keeps everything it was
// ever sent, across specs and across runs of the suite on a server it reuses.
async function namedSince(
  request: Parameters<typeof taken>[0],
  mark: number,
): Promise<readonly number[]> {
  return (await taken(request)).slice(mark).map((one) => one.review.assignment_id)
}

test('the flush refuses a caller carrying no secret', async ({ request }) => {
  expect((await request.post(`${accountURL}${FLUSH_PATH}`)).status()).toBe(401)
})

// Nothing a caller sends names an assignment or a count: what is owed is worked out from the rows
// this server holds. A body is accepted and ignored, which is what says the derivation is the only
// source of a submission.
test('the flush takes no instruction from its caller', async ({ request }) => {
  const before = (await taken(request)).length

  const answered = await request.post(`${accountURL}${FLUSH_PATH}`, {
    headers: { 'x-tanukitsune-sync': SECRET },
    data: { assignmentId: 8002, incorrectMeanings: 99, incorrectReadings: 99, answers: ['x'] },
  })

  expect(answered.ok()).toBe(true)
  // Whatever this flush found to send, none of it carries what the body asked for. The counts are
  // the assertion rather than the total: a real flush may legitimately send rows another spec left.
  const asked = (await taken(request))
    .slice(before)
    .filter((one) => JSON.stringify(one).includes('99'))

  expect(asked).toEqual([])
})

test('a session answered reaches the source once, and a replay sends nothing more', async ({
  page,
  request,
}) => {
  const before = (await taken(request)).length
  const questions = dealt()

  await page.goto(`${accountURL}${sessionPath('fr', 'review')}`)

  for (const question of questions) await answerQuestion(page, question)

  // The end of the session, waited for rather than assumed: the last answer is written before the
  // deck advances, and after the last card there is no next card to advance to. Reloading on the
  // card would drop exactly the row that closes the last subject.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(COPY.review.done)

  // The queue empties and the flush follows it when the page comes up, so the reload is the
  // trigger rather than a wait: both run under one lock, in that order.
  await page.reload()

  // One submission per subject, not per question: the source advances an item only when both its
  // meaning and its reading have been answered.
  const owed = [...new Set(questions.map((question) => question.subject.id))].length

  await expect
    .poll(async () => (await namedSince(request, before)).length, { timeout: 15_000 })
    .toBe(owed)

  const sent = await namedSince(request, before)

  // Every assignment the session covered, once each.
  expect([...sent].sort()).toEqual([...new Set(sent)].sort())

  // The acceptance criterion: the same session flushed again produces one set of submissions and
  // not two. Their created review carries no identifier worth reading back, so what stops the
  // second is the row already marked rather than anything the source would tell us.
  await page.reload()
  await page.waitForTimeout(2_000)

  expect(await namedSince(request, before)).toEqual(sent)
})
