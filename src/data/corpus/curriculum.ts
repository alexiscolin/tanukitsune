// The extensions on the two value imports are there for the reason inventory.ts states: the corpus
// commands run this file through Node rather than a bundler, where an extensionless specifier
// resolves to nothing.
import { unnamedComponents } from '../../core/corpus/decomposition.ts'
import type { ComponentNames, Decomposition, Glyph } from '@/core/corpus/decomposition'
import { partsTaught } from '../../core/corpus/taught.ts'
import type { InventorySubject } from '@/data/corpus/inventory'

// The curriculum walked once, which is what more than one command needs and what none of them may
// answer its own way. The parts of a story are the components the reader has been dealt a card for,
// per docs/decisions/0013-the-curriculum-decides-the-parts.md, so what a locale owes is counted here
// rather than against the whole drawing.

export type Walked = {
  readonly read: readonly Decomposition[]
  // Where the drawing places no part, named as character:part so a reader can find both.
  readonly unplaced: readonly string[]
  // Components the curriculum draws instead of writing, named by the key the report calls them since
  // they carry no character. Owed a name like any other, so the unnamed among them are in owed too.
  readonly drawn: readonly string[]
  readonly owed: readonly string[]
}

export function walkCurriculum(
  subjects: readonly InventorySubject[],
  names: ComponentNames,
  shapeOf: (character: string) => readonly Glyph[],
): Walked {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]))
  const read: Decomposition[] = []
  const unplaced: string[] = []
  const drawn: string[] = []
  const named = shapesNamedByTheirKanji(subjects)
  const radicals = new Set(
    subjects.flatMap((one) =>
      one.type === 'radical' && one.characters !== null && !one.hidden && !named.has(one.characters)
        ? [one.characters]
        : [],
    ),
  )

  for (const subject of subjects) {
    // Content the source has withdrawn is dealt by no session, so counting it would demand names and
    // stories for cards nobody can be shown.
    if (subject.hidden) continue

    if (subject.characters === null) {
      drawn.push(`${subject.type}#${subject.id}`)
      continue
    }
    if (subject.componentIds.length === 0) continue

    const components = subject.componentIds.flatMap((id) => {
      const component = byId.get(id)

      if (component === undefined) return []
      if (component.characters !== null) return [component.characters]

      // A part the curriculum draws rather than writes has no character to be named by, so it is named
      // by the identifier the locale named it under. Dropping it would leave the character looking
      // complete with a part missing, and a story written against that teaches a decomposition the
      // curriculum contradicts. The drawing is keyed by character and can say nothing about where it
      // sits, so partsTaught puts it last, unplaced, and the count below names it as such.
      return [`${component.type}#${component.id}`]
    })

    const decomposition = partsTaught(subject.characters, components, shapeOf(subject.characters))
    read.push(decomposition)

    for (const part of decomposition.parts) {
      if (part.component === null) continue

      // A character that is its own only part is placed by being itself, and the drawing carries no
      // group for it. Counting that as unplaced would report every single-part character as a fault.
      // A character standing beside other parts is placed among them, so it is counted like any other.
      const itself = decomposition.parts.length === 1 && part.component === subject.characters
      if (!itself && part.position === null) unplaced.push(`${subject.characters}:${part.component}`)
    }
  }

  // Both kinds counted here rather than by each command, or the one asking for a name and the one
  // reporting what is left answer differently and each of them looks right.
  const shaped = unnamedComponents(read, names).filter((one) => radicals.has(one))
  const unnamed = drawn.filter((one) => names[one] === undefined)

  return { read, unplaced, drawn, owed: [...shaped, ...unnamed] }
}

// The shapes a kanji already names. A part that is itself a subject with a key needs no name of its
// own: a word made of kanji names them by what they mean. A radical sharing its shape with a kanji is
// that same case while the two are taught under one meaning, the key naming both cards, and naming it
// separately would teach one shape two French words.
//
// Whether the source has withdrawn the radical is a separate question and is not answered here: a
// withdrawn radical is dealt to nobody, so the walk owes no card for it, and its shape can still build
// a kanji that is dealt, which owes the part a name all the same.
//
// Where the two are taught under different meanings it is not that case at all. The radical is a card
// of its own, dealt a median of thirteen levels before its kanji and answered on a different word, so
// the kanji key would show the reader a word for something the shape does not look like. 母 is a chest
// of drawers seen as a shape and a mother read as a character.
//
// Read against everything each side is taught under rather than the first word either states: the
// curriculum lists what it accepts, so the two can share a word neither states first, and 羽 states
// Feathers where its kanji states Feather, Feathers, Wing.
//
// One function rather than one per caller: the walk decides which shapes owe a name and the report
// counts the names sitting where nothing owes one, so two readings of this rule disagree by saying a
// shape is owed a name the line below it says a kanji already writes.
export function shapesNamedByTheirKanji(subjects: readonly InventorySubject[]): ReadonlySet<string> {
  const taught = new Map(
    subjects.flatMap((one) =>
      one.type === 'kanji' && one.characters !== null && !one.hidden
        ? [[one.characters, new Set(one.meanings.map((meaning) => meaning.toLowerCase()))] as const]
        : [],
    ),
  )

  return new Set(
    subjects.flatMap((one) => {
      const shares = taught.get(one.characters ?? '')
      const both = shares !== undefined && one.meanings.some((meaning) => shares.has(meaning.toLowerCase()))

      return one.type === 'radical' && one.characters !== null && both ? [one.characters] : []
    }),
  )
}
