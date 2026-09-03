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

// Who wrote the rows and against what. `writtenBy` is the model the run reaches, since no artifact
// records who wrote one entry of it and the column cannot separate a word a dictionary supplied from
// one a model wrote. The transparency article exists to stop synthetic text passing as written, so
// naming a model where a dictionary supplied the word costs the reader nothing and the reverse is the
// failure. What would let it be exact is provenance per entry, which the artifacts do not carry.
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

// What a subject is answered with in this locale, by kind. The assembly reads the same two records and
// a word needs a third, which nothing derives: a word composes its meaning from the characters it is
// written with.
export type Answers = Written & { readonly words: Readonly<Record<string, string>> }

// A text somebody wrote, or the empty string the artifact itself uses for one nobody has written yet.
// The column carries it as written, and what turns an empty text into an absent one is the read: a
// card shows the block or it does not, and that is not a fact about the table.
function said(text: string | undefined): string {
  return text?.trim() ? text : ''
}

// The four reading columns, or nothing at all: they stand or fall together, since a story about a
// sound rests on the word that sound was bound to.
function soundOf(
  card: Publishable | undefined,
  told: Told | undefined,
): Pick<Row, 'readingMnemonic' | 'reading' | 'anchor' | 'anchorPhonemes'> | null {
  if (card === undefined || told === undefined) return null
  if (card.reading === null || told.reading.trim() === '') return null

  return {
    readingMnemonic: told.reading,
    reading: card.reading,
    anchor: card.anchor,
    anchorPhonemes: card.anchorPhonemes,
  }
}

// The word a subject is answered with, in this locale, or nothing. A kanji is answered with its key, a
// shape with the name the locale gave it, a word with its meaning. Nothing else: a subject the locale
// has no word for cannot be asked in this language at all, so it publishes no row rather than a row
// falling back to the source's own.
export function wordFor(subject: InventorySubject, wrote: Answers): string | undefined {
  if (subject.hidden) return undefined

  // A shape the curriculum draws rather than writes has no character to be found under, so the locale
  // names it by the identifier the curriculum gives it. The same spelling the naming step wrote.
  if (subject.characters === null) {
    return subject.type === 'radical' ? wrote.names[`radical#${subject.id}`] : undefined
  }

  if (subject.type === 'kanji') return wrote.keys[subject.characters]
  if (subject.type === 'radical') return wrote.names[subject.characters] ?? wrote.keys[subject.characters]

  return wrote.words[subject.characters]
}

// Everything a row is built from besides the curriculum and the stamp: the words the locale answers
// with, the kanji cards, and the stories written against them.
export type Held = {
  readonly wrote: Answers
  readonly cards: ReadonlyMap<string, Publishable>
  readonly written: ReadonlyMap<string, Told>
}

// One row per subject the locale can answer, walked by subject rather than by story: a radical and the
// kanji it draws share a character, so a map keyed by one would hold whichever came last. The stories
// join in where there are any, which today is the kanji and nothing else.
export function rowsToPublish(
  subjects: readonly InventorySubject[],
  held: Held,
  stamp: Stamp,
): readonly Row[] {
  return subjects.flatMap((subject) => {
    const row = rowFor(subject, held, stamp)

    return row === null ? [] : [row]
  })
}

function rowFor(subject: InventorySubject, held: Held, stamp: Stamp): Row | null {
  const word = wordFor(subject, held.wrote)
  if (word === undefined) return null

  // Only a kanji has one, and only a kanji is asked for a reading of its own here. A shape and a word
  // take the empty columns the schema reserves for a subject that teaches neither, and a shape the
  // curriculum draws has no character to look one up under at all.
  const drawn = subject.type === 'kanji' ? subject.characters : null
  const card = drawn === null ? undefined : held.cards.get(drawn)
  const told = drawn === null ? undefined : held.written.get(drawn)
  const heard = soundOf(card, told)

  // The empty columns first and what was written over them: a shape and a word carry no card and no
  // story, so most rows are the empty half and the three the locale answered with.
  return {
    subjectId: String(subject.id),
    locale: stamp.locale,
    meaning: word,
    englishKey: null,
    parts: [],
    readingMnemonic: null,
    reading: null,
    anchor: null,
    anchorPhonemes: null,
    ...(card === undefined ? {} : { englishKey: card.englishKey, parts: card.parts }),
    ...heard,
    nuance: said(told?.nuance),
    mnemonic: said(told?.meaning),
    generatedBy: stamp.writtenBy,
    promptVersion: stamp.promptVersion,
    corpusVersion: stamp.corpusVersion,
  }
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
