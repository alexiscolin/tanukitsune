// What a character is made of, and what each part is called. A meaning mnemonic names the parts in
// the order they occur, so this is the input the corpus cannot be written without.
//
// The decomposition comes from KanjiVG and the names are written here, decided with its licence
// obligations in docs/decisions/0012-kanjivg-for-the-decomposition.md.

// `component` is null where the source carries a group with no character behind it. The part is
// really there, in the strokes and in the shape, and nothing can name it: a character holding one is
// reported rather than generated from as though its parts were known.
type Part = {
  readonly component: string | null
  readonly position: string | null
}

export type Decomposition = {
  readonly character: string
  readonly parts: readonly Part[]
}

// The decomposition as the source states it, which is a tree rather than a list: 語 holds 言 and 吾,
// and 吾 holds 五 and 口 in turn. Which depth a mnemonic names is a rule about what the reader can
// already picture, not a fact about the character, so it is applied to this rather than baked into it.
export type Glyph = {
  readonly component: string | null
  readonly position: string | null
  readonly parts: readonly Glyph[]
}

// What one locale calls each component, keyed by the component itself. Written per locale, because a
// name is the language half of the corpus and the decomposition is the neutral half.
export type ComponentNames = Readonly<Record<string, string>>

// How many parts one story can carry. Beyond this the reader is holding a list rather than a scene,
// and the interaction that does the remembering has nowhere to happen. Reported rather than enforced:
// a character that genuinely needs more is a decision, not a defect to be trimmed away silently.
export const MOST_PARTS = 4

// Which depth a mnemonic names. The source states 語 as 言 and 吾, and 吾 is a character the reader has
// no picture of, so the story would rest on something meaningless. Expanding it gives 言, 五 and 口,
// which are three things that can be seen. So a part is kept where the locale can name it, and opened
// where it cannot, down to whatever the reader can already picture.
//
// A part nothing can name and nothing can open is kept as it is: it belongs in the report that says
// what the locale still owes, not in a silence.
export function flatten(
  character: string,
  parts: readonly Glyph[],
  isNameable: (component: string) => boolean,
): Decomposition {
  return { character, parts: parts.flatMap((part) => named(part, isNameable)) }
}

function named(glyph: Glyph, isNameable: (component: string) => boolean): readonly Part[] {
  const { component, position } = glyph

  if (component !== null && isNameable(component)) return [{ component, position }]
  if (glyph.parts.length === 0) return [{ component, position }]

  return glyph.parts.flatMap((part) => named(part, isNameable))
}

export function holdsTooManyParts(decomposition: Decomposition): boolean {
  return decomposition.parts.length > MOST_PARTS
}

// Components no name covers, which is what a mnemonic would otherwise have to leave anonymous.
// Deduplicated and ordered, so the report is a list of work rather than a list of occurrences.
export function unnamedComponents(
  decompositions: readonly Decomposition[],
  names: ComponentNames,
): readonly string[] {
  const missing = new Set<string>()

  for (const { parts } of decompositions) {
    for (const { component } of parts) {
      if (component !== null && names[component] === undefined) missing.add(component)
    }
  }

  return [...missing]
}

// Which characters each component builds. It is the evidence a name is judged on, by the model
// asked for one and by the reader reading it back: a name picturing nothing those characters contain
// is a name for a different shape.
//
// A character standing as its own only part builds nothing, since saying that 木 builds 木 gives a
// model nothing to picture that it was not already handed.
export function composedBy(decompositions: readonly Decomposition[]): ReadonlyMap<string, readonly string[]> {
  // A set rather than a list scanned before each push: a common radical sits in a thousand characters,
  // and asking a list of that length whether it already holds one costs the square of the curriculum.
  const built = new Map<string, Set<string>>()

  for (const { character, parts } of decompositions) {
    for (const { component } of parts) {
      if (component === null || component === character) continue

      const carries = built.get(component) ?? new Set<string>()
      carries.add(character)
      built.set(component, carries)
    }
  }

  return new Map([...built].map(([component, carries]) => [component, [...carries]]))
}

// One name on two components, which costs more than an ugly name: the whole value of naming a part
// is that the same part is called the same thing everywhere, and its converse is that two parts are
// never called the same thing.
export function collidingNames(names: ComponentNames): readonly string[] {
  const seen = new Set<string>()
  const collisions = new Set<string>()

  for (const name of Object.values(names)) {
    if (seen.has(name)) collisions.add(name)
    seen.add(name)
  }

  return [...collisions]
}

// Whether every part of a character carries a component. False is not a defect in the data so much as
// the edge of what it states, and it decides which characters a model may compose from.
export function isFullyStated(decomposition: Decomposition): boolean {
  return decomposition.parts.every(({ component }) => component !== null)
}
