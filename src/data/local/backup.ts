import type { AnswerRecord } from '@/core/review/answer-record'
import type { Backup } from '@/core/review/drain'
import { BACKUP_PATH } from '@/core/routes'

import { postTo } from './posted'

// The browser's other half of the data layer, beside the queue it empties. It carries no
// `server-only`, for the reason `outbox.ts` gives beside the same shape: this runs on the device.
export function backupTo(): Backup {
  return (batch: readonly AnswerRecord[]) => postTo(BACKUP_PATH, batch)
}
