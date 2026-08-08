// The service worker, hand-written for the reasons docs/framing.md gives under the service worker:
// the established plugin cannot run under this bundler and its successor crashes in the combination
// this project would use.
//
// What it holds is the application shell and the static assets, and nothing else. The shell is the
// same document for every reader of a deployment, the sitting being asked for separately, so nothing
// cached here belongs to an account.

const SHELL = 'tanukitsune-shell-1'
const ASSETS = 'tanukitsune-assets-1'

// Addressed by a hash of their content, so one is cached on sight and never revalidated: an
// immutable resource cannot be stale, at any layer.
const IMMUTABLE = '/_next/static/'

// A build that no longer exists answers this for an asset it once served. An offline-first client is
// a long-lived one, so it will ask for one, and treating it as a signal rather than as a failure is
// the only thing between a stale client and a blank screen.
const GONE = 404

async function cached(request, name) {
  const holding = await caches.open(name)
  const held = await holding.match(request)

  return held ?? null
}

// Every cache emptied, this worker unregistered, and every tab reloaded once. Once, because a reload
// that met the same missing asset would do this again.
async function startOver() {
  await Promise.all((await caches.keys()).map((name) => caches.delete(name)))
  await self.registration.unregister()

  for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url)
}

// Cached on sight and served from there ever after. A hashed URL names one build, so a hit is the
// right answer and a miss on a build that has gone is the signal above.
async function asset(request) {
  const held = await cached(request, ASSETS)
  if (held !== null) return held

  const answered = await fetch(request)

  if (answered.status === GONE) {
    await startOver()

    return answered
  }

  if (answered.ok) void (await caches.open(ASSETS)).put(request, answered.clone())

  return answered
}

// The network first, because a deployment that moved should be met rather than avoided, and the held
// shell where there is no network at all. That fallback is the whole offline story: the document
// arrives, and the screen inside it asks the device for its sitting.
async function shell(request) {
  try {
    const answered = await fetch(request)

    if (answered.ok) void (await caches.open(SHELL)).put(request, answered.clone())

    return answered
  } catch (unreachable) {
    const held = await cached(request, SHELL)

    if (held !== null) return held

    throw unreachable
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(shell(request))

    return
  }

  if (new URL(request.url).pathname.startsWith(IMMUTABLE)) event.respondWith(asset(request))
})

// A worker that took over mid-session is a screen that changed under a reader who was answering, so
// it waits. The page says when: the session ended, or the application went away.
self.addEventListener('message', (event) => {
  if (event.data === 'activate') void self.skipWaiting()
})

// Taking control does not replay the navigation that loaded the page, so the document a reader is
// already looking at would be held by nothing until they came back to it. Fetched here instead, so
// one visit is enough for the next one to work with no network.
async function takeOver() {
  await self.clients.claim()

  const holding = await caches.open(SHELL)

  await Promise.all(
    (await self.clients.matchAll({ type: 'window' })).map((client) =>
      holding.add(new Request(client.url)).catch(() => undefined),
    ),
  )
}

self.addEventListener('activate', (event) => {
  event.waitUntil(takeOver())
})
