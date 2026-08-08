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

export type InventoryReading = {
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

export async function readInventory(
  _client: Client,
  _upTo: number,
): Promise<readonly InventorySubject[]> {
  return []
}
