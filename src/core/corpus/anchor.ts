// Whether a French word can stand for a Japanese reading, judged on sounds rather than on spelling.
//
// The anchor's own pronunciation is derived from a French lexicon before it reaches here, never taken
// from what a model claimed it to be: the gap between the two is a hallucinated pronunciation, and it
// is the cheapest one in the whole pipeline to catch.

export function agreesAtTheStart(_reading: readonly string[], _anchor: readonly string[]): boolean {
  return false
}

export function impossibleOnset(_reading: readonly string[], _anchor: readonly string[]): string | null {
  return null
}

export function distanceBetween(_reading: readonly string[], _anchor: readonly string[]): number {
  return 1
}
