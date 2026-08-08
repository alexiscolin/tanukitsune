// The one shape both halves of the sync send: a bounded JSON post, answering true only where the
// server said so. It carries no `server-only`, for the reason outbox.ts gives beside the same
// shape: this runs on the device.
//
// It carries no secret. The browser holds one the page cannot read and sends it with a same-origin
// request on its own, which is what keeps it out of the document the service worker caches.

// What one call may take before the page treats the server as unreachable. A request has no
// deadline of its own, so a connection that opens and never answers would hold the sync's lock for
// as long as the tab lives and stop that tab syncing again. Generous rather than tight: this bounds
// a hang, and a slow network is not one.
const CALL_TIMEOUT = 30_000

export async function postTo(path: string, body: unknown): Promise<boolean> {
  const answered = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CALL_TIMEOUT),
  }).catch(() => null)

  // A refusal and a server that could not be reached are one answer to a caller here: what was sent
  // stays where it was, and no outcome makes it send the same thing twice.
  return answered?.ok ?? false
}
