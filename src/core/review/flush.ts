import type { Submission } from './submission'

// What empties the backup into the source. It runs in the page rather than on the server, per
// docs/framing.md, and it reads the backed-up rows rather than the browser's queue: an answer
// leaves the device as soon as the backup confirms it, so by here the device no longer holds it.
//
// Declared here so core/ never learns that either side is an HTTP route. data/ implements both and
// app/ wires them, which is the inversion `OutboxPort` and `Backup` are under.

// What is left to send, worked out where the rows are. It comes back oldest first, scheduling
// being order dependent.
export type Pending = () => Promise<readonly Submission[]>

// What became of one submission, and the three are not two: the source refusing an item that is no
// longer due is a drop rather than a failure, so the answer keeps its outcome in our history marked
// as not applied and the walk carries on past it. Anything else holds, and holding stops the walk:
// sending the rest would advance the newest while the oldest waited.
export type Sent = 'applied' | 'dropped' | 'held'

export type Send = (submission: Submission) => Promise<Sent>

// Strictly serial, because scheduling is order dependent: two submissions in flight advance two
// items in whatever order the network settles them. It stops where it failed rather than sending
// past it, so the newest never land while the oldest wait.
export async function flush(pending: Pending, send: Send): Promise<Sent[]> {
  const outcomes: Sent[] = []

  for (const submission of await pending()) {
    const outcome = await send(submission)

    outcomes.push(outcome)
    if (outcome === 'held') return outcomes
  }

  return outcomes
}
