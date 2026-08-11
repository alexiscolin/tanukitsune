// What more than one corpus command needs, and what none of them may answer its own way. The commands
// stay separate files because each is one step of the pipeline; only the two things they genuinely
// share live here.

import { gunzipSync } from 'node:zlib'

// A pinned release, fetched and unpacked. The name is the source's, so a failure says which of them
// answered rather than leaving an operator to guess from a bare status.
export async function fetched(source: string, named: string): Promise<string> {
  const response = await fetch(source)
  if (!response.ok) throw new Error(`${named} answered ${response.status}`)

  return gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8')
}

// A count, and enough of the list to act on. Twenty, because a report is read in a terminal and a
// thousand characters of overflow hides every line around it.
export function list(entries: readonly string[]): string {
  if (entries.length === 0) return '0'

  const shown = entries.slice(0, 20).join(' ')

  return entries.length > 20 ? `${entries.length}, first 20: ${shown}` : `${entries.length}: ${shown}`
}
