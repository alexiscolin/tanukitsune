// What a character is made of, and what each part is called. A meaning mnemonic names the parts in
// the order they occur, so this is the input the corpus cannot be written without.
//
// The decomposition comes from KanjiVG and the names are written here, decided with its licence
// obligations in docs/decisions/0012-kanjivg-for-the-decomposition.md.

// `component` is null where the source carries a group with no character behind it. The part is
// really there, in the strokes and in the shape, and nothing can name it: a character holding one is
// reported rather than generated from as though its parts were known.
export type Part = {
  readonly component: string | null
  readonly position: string | null
}

export type Decomposition = {
  readonly character: string
  readonly parts: readonly Part[]
}

// What one locale calls each component, keyed by the component itself. Written per locale, because a
// name is the language half of the corpus and the decomposition is the neutral half.
export type ComponentNames = Readonly<Record<string, string>>

// Components no name covers, which is what a mnemonic would otherwise have to leave anonymous.
// Deduplicated and ordered, so the report is a list of work rather than a list of occurrences.
export function unnamedComponents(
  _decompositions: readonly Decomposition[],
  _names: ComponentNames,
): readonly string[] {
  return []
}

// One name on two components, which costs more than an ugly name: the whole value of naming a part
// is that the same part is called the same thing everywhere, and its converse is that two parts are
// never called the same thing.
export function collidingNames(_names: ComponentNames): readonly string[] {
  return []
}

// Whether every part of a character carries a component. False is not a defect in the data so much as
// the edge of what it states, and it decides which characters a model may compose from.
export function isFullyStated(_decomposition: Decomposition): boolean {
  return true
}
