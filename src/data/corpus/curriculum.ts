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
  // Components the curriculum draws instead of writing, which carry no character to be named by.
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
  const drawn = new Set<string>()
  // A part that is itself a subject with a key of its own needs no component name: a word made of
  // kanji names them by what they mean. A radical owes one even where a kanji of the same shape has a
  // key, since a story names the part it draws rather than the character that shares its outline.
  const radicals = new Set(
    subjects.filter((one) => one.type === 'radical' && one.characters !== null).map((one) => one.characters),
  )

  for (const subject of subjects) {
    // Content the source has withdrawn is dealt by no session, so counting it would demand names and
    // stories for cards nobody can be shown.
    if (subject.hidden) continue

    if (subject.characters === null) {
      drawn.add(`${subject.type}#${subject.id}`)
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

  return { read, unplaced, drawn: [...drawn], owed: unnamedComponents(read, names).filter((one) => radicals.has(one)) }
}
