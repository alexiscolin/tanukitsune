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

        return 'applied'
      },
    )

    expect(sent).toEqual([1, 2, 3])
    // Scheduling is order dependent, so two submissions in flight at once is two items advanced
    // in whatever order the network settled them.
    expect(overlapped).toBe(false)
  })

  // Sending the rest after something held would advance the newest items while the oldest stayed
  // behind, which is the one order this must not produce.
  it('stops where it was held rather than sending past it', async () => {
    const sent: number[] = []

    const outcomes = await flush(
      () => Promise.resolve([submission(1), submission(2), submission(3)]),
      (one) => {
        sent.push(one.assignmentId)

        return Promise.resolve(one.assignmentId === 2 ? 'held' : 'applied')
      },
    )

    expect(sent).toEqual([1, 2])
    expect(outcomes).toEqual(['applied', 'held'])
  })

  // A drop is not a failure: the source refused an item that is no longer due, the row records
  // that it was not applied, and the ones behind it are still owed their submission.
  it('carries on past a drop', async () => {
    const outcomes = await flush(
      () => Promise.resolve([submission(1), submission(2), submission(3)]),
      (one) => Promise.resolve(one.assignmentId === 2 ? 'dropped' : 'applied'),
    )

    expect(outcomes).toEqual(['applied', 'dropped', 'applied'])
  })

  it('asks for nothing to send and sends nothing', async () => {
    let asked = 0

    await flush(
      () => Promise.resolve([]),
      () => {
        asked += 1

        return Promise.resolve('applied')
      },
    )

    expect(asked).toBe(0)
  })
})
