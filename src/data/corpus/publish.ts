// The rows a locale's written cards become. Nothing here opens a database: what a card is made of and
// what somebody wrote for it arrive resolved, and a row is built or it is not.
//
// A column a row must carry is a column a reader is shown, so a card missing one is left out rather
// than written half. The report is what says a card is owed something; this writes what is ready.

import type { Told } from './story-run.ts'

// What a card is, in the words the reader meets, plus the identifier the table is keyed by. The
// reading columns are null together: a component teaches no reading, and a word whose reading is the
// one its kanji already gave teaches none either.
export type Publishable = {
  readonly subjectId: string
  readonly key: string
  // The release's own English, never the account's, and empty for a shape whose French name stands
  // for a drawing rather than for a word.
  readonly englishKey: string | null
  readonly parts: readonly string[]
  readonly reading: string | null
  readonly anchor: string | null
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

export function rowsToPublish(
  cards: ReadonlyMap<string, Publishable>,
  written: ReadonlyMap<string, Told & { readonly nuance: string }>,
  stamp: Stamp,
): readonly Row[] {
  const rows: Row[] = []

  for (const [character, told] of written) {
    const card = cards.get(character)

    if (card === undefined) continue
    if (told.meaning.trim() === '' || told.nuance.trim() === '') continue

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
