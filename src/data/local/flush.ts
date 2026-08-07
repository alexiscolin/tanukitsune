import type { Pending, Send } from '@/core/review/flush'
import type { Submission } from '@/core/review/submission'
import { BACKUP_SECRET_HEADER, FLUSH_PATH } from '@/core/routes'

// The page's half of the flush, beside the backup it follows. It carries no `server-only`, for the
// reason backup.ts gives beside the same shape: this runs on the device.

// What one call may take before the page treats the server as unreachable. The same bound the
// backup takes, and for the same reason: a connection that opens and never answers would hold the
// lock for as long as the tab lives.
const CALL_TIMEOUT = 30_000

function headersFor(secret: string): HeadersInit {
  return { 'content-type': 'application/json', [BACKUP_SECRET_HEADER]: secret }
}

// The secret is a parameter rather than a module read, because nothing on the device can reach the
// environment: it is read on the server and handed to the page that sends it.
export function pendingAt(secret: string): Pending {
  return async () => {
    const answered = await fetch(FLUSH_PATH, {
      headers: headersFor(secret),
      signal: AbortSignal.timeout(CALL_TIMEOUT),
    }).catch(() => null)

    if (answered?.ok !== true) return []

    const body: unknown = await answered.json().catch(() => null)

    // Shaped by this server from rows it holds, so it is read rather than parsed again: what would
    // be checked here was decided by core/ on the other side of the call.
    return (body as { pending?: readonly Submission[] } | null)?.pending ?? []
  }
}

export function sendTo(secret: string): Send {
  return async (submission) => {
    const sent = await fetch(FLUSH_PATH, {
      method: 'POST',
      headers: headersFor(secret),
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(CALL_TIMEOUT),
    }).catch(() => null)

    // A refusal and a server that could not be reached are one answer: the submission stays
    // pending either way, and no outcome makes the flush send it twice.
    return sent?.ok ?? false
  }
}
