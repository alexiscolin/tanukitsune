import { describe, expect, it } from 'vitest'

import { flush } from './flush'
import type { Submission } from './submission'

// The loop that empties what the backup holds into the source, which runs in the page rather than
// on the server: docs/framing.md puts it there, beside the drain and under the same lock.

function submission(assignmentId: number): Submission {
  return { assignmentId, incorrectMeanings: 0, incorrectReadings: 0, answers: [`${assignmentId}`] }
}

describe('flush', () => {
  it('sends what is pending, oldest first and one at a time', async () => {
    const sent: number[] = []
    let running = 0
    let overlapped = false

    await flush(
      () => Promise.resolve([submission(1), submission(2), submission(3)]),
      async (one) => {
        running += 1
        overlapped ||= running > 1
        await Promise.resolve()
        sent.push(one.assignmentId)
        running -= 1

        return true
      },
    )

    expect(sent).toEqual([1, 2, 3])
    // Scheduling is order dependent, so two submissions in flight at once is two items advanced
    // in whatever order the network settled them.
    expect(overlapped).toBe(false)
  })

  // Sending the rest after a refusal would advance the newest items while the oldest stayed
  // behind, which is the one order this must not produce.
  it('stops where it failed rather than sending past it', async () => {
    const sent: number[] = []

    await flush(
      () => Promise.resolve([submission(1), submission(2), submission(3)]),
      (one) => {
        sent.push(one.assignmentId)

        return Promise.resolve(one.assignmentId !== 2)
      },
    )

    expect(sent).toEqual([1, 2])
  })

  it('asks for nothing to send and sends nothing', async () => {
    let asked = 0

    await flush(
      () => Promise.resolve([]),
      () => {
        asked += 1

        return Promise.resolve(true)
      },
    )

    expect(asked).toBe(0)
  })
})
