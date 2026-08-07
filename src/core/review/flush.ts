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

// True means the source took it and the row it answers for has been marked. Anything else is one
// answer: the submission stays pending. Nothing here tells a refusal from a network that dropped,
// because neither is a reason to send the same submission twice.
export type Send = (submission: Submission) => Promise<boolean>

// Strictly serial, because scheduling is order dependent: two submissions in flight advance two
// items in whatever order the network settles them. It stops where it failed rather than sending
// past it, so the newest never land while the oldest wait.
export async function flush(pending: Pending, send: Send): Promise<void> {
  for (const submission of await pending()) if (!(await send(submission))) return
}
