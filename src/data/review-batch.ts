import type { AnswerRecord } from '@/core/review/answer-record'

// The wire shape of what a browser queued, parsed at the boundary the way wanikani/payload.ts
// parses theirs: an untrusted body becomes a core type here or it becomes nothing.

// Null rather than a thrown error, the caller being a route that answers a status either way and
// has nothing to add to a message this could write.
export function parseBatch(input: unknown): readonly AnswerRecord[] | null {
  void input

  return null
}
