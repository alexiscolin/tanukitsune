import { expect, test, type BrowserContext } from '@playwright/test'

import { BACKUP_PATH, sessionPath } from '../src/core/routes'
import { answerCard, BACKUP_ROUTE, cardReady, queueLength, written } from './session'

// The drain, driven through a real browser because everything it stands on is one: the queue is
// IndexedDB, the triggers are the platform's own events, and the single leader is a Web Lock. What
// the batch becomes on the other side is covered against the database in `backup.spec.ts`, so what
// is asked here is when the browser sends and what it keeps.
//
// The deck is the seeded one, the server under this suite holding no token, and the backup is
// configured. That is the only branch there is: what decides whether answers leave the device is
// the shared secret, never which deck dealt them.

// A batch as it left the browser. Only the identifiers are read: what a row carries is the route's
// business and is asserted where the route is.
type SentRow = { readonly id: string }

// Every batch the context posted, in order, recorded at the request rather than at the response so
// that a send which never arrived still counts as a send.
function postedBy(context: BrowserContext): SentRow[][] {
  const batches: SentRow[][] = []

  context.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === BACKUP_PATH)
      batches.push(JSON.parse(request.postData() ?? '[]') as SentRow[])
  })

  return batches
}

// The acceptance criterion the product is built around: a session finishes with no network and
// syncs when it comes back. Airplane mode reaches the page as `online`, which is what the drain
// listens for.
test('an answer given offline reaches the backup when the network returns', async ({
  page,
  context,
}) => {
  const batches = postedBy(context)

  await page.goto(sessionPath('fr', 'review'))
  await context.setOffline(true)
  await answerCard(page, 0)
  await expect.poll(() => queueLength(page)).toBe(1)

  const queued = await written(page)
  // Nothing is attempted while the network is gone. A send recorded here is one the reader paid
  // for on a train rather than one the queue was holding for them.
  expect(batches).toEqual([])

  await context.setOffline(false)

  await expect.poll(() => queueLength(page)).toBe(0)
  // The row that was queued is the row that was sent, rather than a row of the right shape.
  expect(batches.flat().map((row) => row.id)).toEqual(queued.map((row) => row.id))
})

// The second trigger, and the one covering a reader who answered with no network and left the tab
// rather than reconnecting in front of it. The event is dispatched rather than produced by
// backgrounding the tab, so what this holds is that the listener is on `document` and that it
// drains while the page is visible.
//
// The answer is given with the network up, and nothing sends it: no drain runs on an append, and
// the page came up before it existed. So the return to the tab is the only thing that can have.
test('returning to the tab drains what is still queued', async ({ page, context }) => {
  const batches = postedBy(context)

  await page.goto(sessionPath('fr', 'review'))
  await answerCard(page, 0)
  await expect.poll(() => queueLength(page)).toBe(1)
  expect(batches).toEqual([])

  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })

  await expect.poll(() => queueLength(page)).toBe(0)
  expect(batches).toHaveLength(1)
})

// Multi-tab is a week-one case rather than an edge case, per docs/specs/v0.1.md. Two pages in one
// context rather than two contexts: a context is its own storage partition, so two of them share
// neither the queue nor the locks, and that pair would prove two independent queues instead.
test('two tabs sharing one queue send it once', async ({ context }) => {
  const batches = postedBy(context)

  // The backup is held open, so the follower is offered the queue while the leader is still
  // inside it. That is the moment a queue with no leader sends the same answer twice.
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await context.route(BACKUP_ROUTE, async (route) => {
    await held
    await route.continue()
  })

  const [leader, follower] = await Promise.all([context.newPage(), context.newPage()])
  await Promise.all([
    leader.goto(sessionPath('fr', 'review')),
    follower.goto(sessionPath('fr', 'review')),
  ])
  // The demo deck empties the queue when it starts, so the second tab is up before the first one
  // answers. Its own restart would otherwise take the answer away.
  await cardReady(follower, 0)

  await answerCard(leader, 0)
  await expect.poll(() => queueLength(leader)).toBe(1)

  // One reconnection for the context, so both tabs are offered the same queue at the same moment.
  await context.setOffline(true)
  await context.setOffline(false)

  await expect.poll(() => batches.length).toBe(1)
  release()

  await expect.poll(() => queueLength(leader)).toBe(0)
  // The follower found the lock taken and gave up. A tab that had read the queue alongside the
  // leader would have sent this row twice.
  expect(batches).toHaveLength(1)
})
