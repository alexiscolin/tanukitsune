import type { AnswerRecord } from '@/core/review/answer-record'
import type { Backup } from '@/core/review/drain'
import { BACKUP_PATH, BACKUP_SECRET_HEADER } from '@/core/routes'

// The browser's other half of the data layer, beside the queue it empties. It carries no
// `server-only`, for the reason `outbox.ts` gives beside the same shape: this runs on the device.

// What one send may take before the queue treats the server as unreachable. A request has no
// deadline of its own, so a connection that opens and never answers would hold the drain's lock for
// as long as the tab lives and stop that tab draining again. Generous rather than tight: this bounds
// a hang, and a slow network is not one.
const SEND_TIMEOUT = 30_000

// The secret is a parameter rather than a module read, because nothing on the device can reach the
// environment: it is read on the server and handed to the page that sends it.
export function backupTo(secret: string): Backup {
  return async (batch: readonly AnswerRecord[]) => {
    const stored = await fetch(BACKUP_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [BACKUP_SECRET_HEADER]: secret },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(SEND_TIMEOUT),
    }).catch(() => null)

    return stored?.ok ?? false
  }
}
