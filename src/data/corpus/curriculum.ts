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
  // A part that is itself a subject with a key of its own needs no component name: a word made of
  // kanji names them by what they mean. A radical sharing its shape with a kanji is that same case
  // while the two are taught under one meaning, the key naming both cards, and naming it separately
  // would teach one shape two French words.
  //
  // Where the two are taught under different meanings it is not that case at all. The radical is a card
  // of its own, dealt a median of thirteen levels before its kanji and answered on a different word, so
  // the kanji key would show the reader a word for something the shape does not look like. 母 is a chest
  // of drawers seen as a shape and a mother read as a character.
  //
  // Withdrawn on the same grounds as the loop below: a kanji nobody can be shown teaches no key, so it
  // names nothing.
  const written = new Map(
    subjects
      .filter((one) => one.type === 'kanji' && one.characters !== null && !one.hidden)
      .map((one) => [one.characters, one.meanings[0]?.toLowerCase()]),
  )
  const radicals = new Set(
    subjects
      .filter(
        (one) =>
          one.type === 'radical' &&
          one.characters !== null &&
          (!written.has(one.characters) || written.get(one.characters) !== one.meanings[0]?.toLowerCase()),
      )
      .map((one) => one.characters),
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

      // A part the curriculum draws rather than writes cannot be named by its character. Dropping it
      // in silence would leave the character looking complete with one part missing, so the character
      // is named here as well as the part.
      unplaced.push(`${subject.characters ?? '?'}:drawn#${component.id}`)

      return []
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
