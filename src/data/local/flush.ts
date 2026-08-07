import { FLUSH_PATH } from '@/core/routes'

import { postTo } from './posted'

// The page's half of the flush, which is a trigger and not a loop: what is owed is worked out where
// the rows are, so nothing here names an assignment or a count and there is no body to send. It
// carries no `server-only`, for the reason backup.ts gives beside the same shape: this runs on the
// device.
//
// One call a sitting rather than one a submission: the reads that say what is owed cost the source
// six requests, and the whole point of paying them on the server is paying them once.
export function flushTo(secret: string): () => Promise<void> {
  return async () => {
    await postTo(FLUSH_PATH, secret, null)
  }
}
