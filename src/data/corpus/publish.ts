// The rows a locale's written cards become. Nothing here opens a database: what a card is made of and
// what somebody wrote for it arrive resolved, and a row is built or it is not.
//
// A column a row must carry is a column a reader is shown, so a card missing one is left out rather
// than written half. The report is what says a card is owed something; this writes what is ready.

import type { ComponentNames, Decomposition } from '../../core/corpus/decomposition.ts'
import type { InventorySubject } from './inventory.ts'
import type { Card, Told } from './story-run.ts'

// What a card is, in the words the reader meets, plus the identifier the table is keyed by. The
// reading columns are null together: a component teaches no reading, and a word whose reading is the
// one its kanji already gave teaches none either.
export type Publishable = Card & {
  readonly subjectId: string
  // The release's own English, never the account's, and empty for a shape whose French name stands
  // for a drawing rather than for a word.
  readonly englishKey: string | null
  readonly anchorPhonemes: readonly string[] | null
}

// Who wrote the rows and against what. `writtenBy` is the model that produced the text, or a marker
// saying no model did: the transparency article applies to synthetic text, and a story somebody typed
// is not that, so the column says which of the two it is rather than naming a model either way.
export type Stamp = {
  readonly locale: string
  readonly writtenBy: string
  readonly promptVersion: string
  readonly corpusVersion: string
}

export type Row = {
  readonly subjectId: string
  readonly locale: string
  readonly meaning: string
  readonly englishKey: string | null
  readonly nuance: string
  readonly mnemonic: string
  readonly readingMnemonic: string | null
  readonly reading: string | null
  readonly anchor: string | null
  readonly anchorPhonemes: readonly string[] | null
  readonly parts: readonly string[]
  readonly generatedBy: string
  readonly promptVersion: string
  readonly corpusVersion: string
}

// A card is written when it carries the two texts every row must have. The reading story is not one of
// them: 328 readings have no word bound, so a card whose reading story is empty is a card still waiting
// for one rather than a card half written.
export function readyToPublish(told: Told): boolean {
  return told.meaning.trim() !== '' && told.nuance.trim() !== ''
}

export function rowsToPublish(
  cards: ReadonlyMap<string, Publishable>,
  written: ReadonlyMap<string, Told>,
  stamp: Stamp,
): readonly Row[] {
  const rows: Row[] = []

  for (const [character, told] of written) {
    const card = cards.get(character)

    if (card === undefined) continue
    if (!readyToPublish(told)) continue

    const reads = told.reading.trim() !== '' && card.reading !== null

    rows.push({
      subjectId: card.subjectId,
      locale: stamp.locale,
      meaning: card.key,
      englishKey: card.englishKey,
      nuance: told.nuance,
      mnemonic: told.meaning,
      readingMnemonic: reads ? told.reading : null,
      reading: reads ? card.reading : null,
      anchor: reads ? card.anchor : null,
      anchorPhonemes: reads ? card.anchorPhonemes : null,
      parts: card.parts,
      generatedBy: stamp.writtenBy,
      promptVersion: stamp.promptVersion,
      corpusVersion: stamp.corpusVersion,
    })
  }

  return rows
}

// What the locale wrote, which is everything the assembly reads besides the curriculum itself.
export type Written = {
  readonly names: ComponentNames
  readonly keys: Readonly<Record<string, string>>
  readonly bound: ReadonlyMap<string, { readonly anchor: string; readonly phonemes: readonly string[] }>
}

// What every kanji card is made of, assembled once. The report judges a story against this and
// publishing writes it, and two copies of the assembly is a story judged against one list and graded
// against another.
export function cardsFrom(
  subjects: readonly InventorySubject[],
  walked: readonly Decomposition[],
  { names, keys, bound }: Written,
): ReadonlyMap<string, Publishable> {
  const drawn = new Map(walked.map((one) => [one.character, one.parts]))
  const cards = new Map<string, Publishable>()

  for (const subject of subjects) {
    if (subject.type !== 'kanji' || subject.characters === null || subject.hidden) continue

    const key = keys[subject.characters]
    if (key === undefined) continue

    const taught = subject.readings.find((reading) => reading.primary)?.value ?? null
    const anchor = taught === null ? undefined : bound.get(taught)

    cards.set(subject.characters, {
      subjectId: String(subject.id),
      key,
      // Nothing writes an English key yet: the release states one and no step of the run carries it
      // across, so every row asserts the empty value the schema reserves for a shape whose French name
      // stands for a drawing. It is a hole rather than a decision, and the report is where it is named.
      englishKey: null,
      // The parts the curriculum deals rather than the ones the drawing opens, per ADR 0013, and a part
      // carrying the word the story must end on is that word said twice.
      parts: (drawn.get(subject.characters) ?? []).flatMap((part) => {
        const word = part.component === null ? undefined : (names[part.component] ?? keys[part.component])

        return word === undefined || word === key ? [] : [word]
      }),
      reading: anchor === undefined ? null : taught,
      anchor: anchor?.anchor ?? null,
      anchorPhonemes: anchor?.phonemes ?? null,
    })
  }

  return cards
}
