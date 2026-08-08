import { subjectCollection } from '../wanikani/payload'
import type { SubjectEntry } from '../wanikani/payload'

// Every subject the curriculum deals, level by level, so the corpus covers what a session can show
// rather than what a decomposition happens to contain. Without it a card can be missing and nothing
// says so until a reader meets an empty screen.
//
// It does not go through `KnowledgeSource`. That port is what the product reads, which is what is
// waiting for one reader; this is a build-time tool asking for whole levels at once, and widening a
// frozen interface to serve a tool would push the tool's needs into the product.
//
// What comes back is used to check our own keys and to prove coverage. Their meaning strings are
// theirs: they stay on the machine that generated and never travel into anything published, which is
// the rule in docs/framing.md about what a public chunk may carry.

type InventoryReading = {
  readonly value: string
  readonly type: string | null
  readonly primary: boolean
}

export type InventorySubject = {
  readonly id: number
  readonly type: string
  readonly level: number
  readonly characters: string | null
  readonly meanings: readonly string[]
  readonly readings: readonly InventoryReading[]
}

export type Client = { readonly token: string; readonly api: string }

// Their shape is versioned by date and the header is not optional, the same pin the product's own
// reader holds: without it the answer is whatever revision they consider current, which is a payload
// nobody wrote a parser for.
const REVISION = '20170710'

export async function readInventory(
  client: Client,
  upTo: number,
): Promise<readonly InventorySubject[]> {
  const levels = Array.from({ length: upTo }, (_, index) => index + 1).join(',')
  const subjects: InventorySubject[] = []

  let next: string | null = `${client.api}/subjects?levels=${levels}`

  while (next !== null) {
    const response = await fetch(next, {
      headers: { Authorization: `Bearer ${client.token}`, 'Wanikani-Revision': REVISION },
    })
    if (!response.ok) throw new Error(`the source answered ${response.status} for ${next}`)

    const page = subjectCollection.parse(await response.json())
    subjects.push(...page.data.map(taken))
    next = page.pages.next_url
  }

  return subjects
}

// Only what the corpus asks of a subject. Everything else their payload carries is content of theirs
// that a build-time file has no reason to hold.
function taken(entry: SubjectEntry): InventorySubject {
  return {
    id: entry.id,
    type: entry.object,
    level: entry.data.level,
    characters: entry.data.characters,
    meanings: entry.data.meanings.filter((one) => one.accepted_answer).map((one) => one.meaning),
    readings: (entry.data.readings ?? [])
      .filter((one) => one.accepted_answer)
      .map((one) => ({ value: one.reading, type: one.type ?? null, primary: one.primary })),
  }
}
