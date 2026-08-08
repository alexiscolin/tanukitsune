import { z } from 'zod'

// The extensions are written here and nowhere else in src/, because the corpus commands run this file
// through Node directly rather than through a bundler, and an extensionless specifier resolves to
// nothing there. One parser for their payload, and one guarded walk, are worth two unusual imports.
import { collect } from '../wanikani/paging.ts'
import type { Client } from '../wanikani/paging.ts'
import { subjectCollection } from '../wanikani/payload.ts'
import type { SubjectEntry } from '../wanikani/payload.ts'

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
  // Which subjects this one is built from, as the curriculum itself states it. It decides what a
  // mnemonic may name, so that a story rests on parts the reader has been dealt a card for rather
  // than on parts a decomposition happens to see. It is theirs, so it stays here and never reaches
  // anything published: see docs/decisions/0013-the-curriculum-decides-the-parts.md.
  readonly componentIds: readonly number[]
}

export async function readInventory(
  client: Client,
  upTo: number,
): Promise<readonly InventorySubject[]> {
  const levels = Array.from({ length: upTo }, (_, index) => index + 1).join(',')
  const entries = await collect(client, subjectCollection, `${client.api}/subjects?levels=${levels}`)

  return entries.map(taken)
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
    componentIds: entry.data.component_subject_ids ?? [],
  }
}

// Where the command writes it and the report reads it, named once so a moved file is a compile error
// rather than a report that silently answers the other question.
export const INVENTORY_FILE = 'corpus/.inventory.json'

// Read back from the file the inventory command wrote, so a report and a generation both work from
// one fetch rather than asking the account again for something that did not change.
const file = z.object({
  upTo: z.number(),
  subjects: z.array(
    z.object({
      id: z.number(),
      type: z.string(),
      level: z.number(),
      characters: z.string().nullable(),
      meanings: z.array(z.string()),
      readings: z.array(z.object({ value: z.string(), type: z.string().nullable(), primary: z.boolean() })),
      componentIds: z.array(z.number()),
    }),
  ),
})

export function readInventoryFile(json: string): {
  readonly upTo: number
  readonly subjects: readonly InventorySubject[]
} {
  return file.parse(JSON.parse(json))
}
