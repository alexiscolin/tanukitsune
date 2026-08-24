// What more than one corpus command needs, and what none of them may answer its own way. The commands
// stay separate files because each is one step of the pipeline; what they genuinely share lives here.

import { gunzipSync } from 'node:zlib'

import type { InventorySubject } from '../src/data/corpus/inventory.ts'
import { asOptional } from '../src/data/optional-text.ts'

// Where KANJIDIC2 is served from. One rolling file rather than a versioned one, which is why what a run
// read is taken from the release itself and written down beside what it produced.
export const KANJIDIC = 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz'

// A release, fetched and unpacked. The name is the source's, so a failure says which of them
// answered rather than leaving an operator to guess from a bare status.
//
// Asked again where the host refuses or the read breaks off, since these releases are served by
// volunteers and a refusal that clears in seconds would otherwise end a run that had already paid for
// the steps behind it. A status the host actually returned is not retried: it answered, and asking
// again gets the same answer.
export async function fetched(source: string, named: string): Promise<string> {
  const MOST_TRIES = 4

  for (let tried = 1; ; tried += 1) {
    try {
      const response = await fetch(source)
      if (!response.ok) throw new Error(`${named} answered ${response.status}`)

      return gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8')
    } catch (reason) {
      if (tried >= MOST_TRIES || (reason instanceof Error && reason.message.startsWith(`${named} answered`))) throw reason

      process.stdout.write(`${named} did not answer, asking again in ${tried * 5} seconds\n`)
      await new Promise((wake) => setTimeout(wake, tried * 5000))
    }
  }
}

// A count, and enough of the list to act on. Twenty, because a report is read in a terminal and a
// thousand characters of overflow hides every line around it.
export function list(entries: readonly string[]): string {
  if (entries.length === 0) return '0'

  const shown = entries.slice(0, 20).join(' ')

  return entries.length > 20 ? `${entries.length}, first 20: ${shown}` : `${entries.length}: ${shown}`
}

// What every command asking a model needs before it can ask anything: the key, and the bound letting a
// first run be read by hand before the rest is paid for. The key comes from `.env.local`, which these
// commands load themselves, the application being handed it by the framework and a plain Node run not.
export function asked(argv: readonly string[]): { locale: string; most: number; reach: { key: string } } {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // Absent before the first bootstrap, which is not an error.
  }

  const bound = argv[3]
  if (bound !== undefined && (!Number.isInteger(Number(bound)) || Number(bound) < 1)) {
    throw new Error(`most must be a whole number above zero, got ${bound}`)
  }

  const key = asOptional(process.env['ANTHROPIC_API_KEY'])
  if (key === undefined) throw new Error('ANTHROPIC_API_KEY is not set')

  return { locale: argv[2] ?? 'fr', most: bound === undefined ? Infinity : Number(bound), reach: { key } }
}

// The characters this locale teaches, in the order the reader meets them, which is what makes a
// selection over them reproducible. Written once because three commands walk the same list and none of
// them may answer it its own way.
export function taughtCharacters(subjects: readonly InventorySubject[]): readonly string[] {
  return subjects
    .filter((one) => one.type === 'kanji' && one.characters !== null && !one.hidden)
    .sort((one, other) => one.level - other.level || one.id - other.id)
    .map((one) => one.characters as string)
}
