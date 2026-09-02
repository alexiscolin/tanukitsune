// Every story a locale has written, held to the rules that judge one. The command that asks a model
// for a story is not written yet, and the rules do not wait for it: a story written by hand is judged
// by exactly what a bought one will be judged by, or the two are two standards.
//
// What a card is made of arrives resolved. Assembling it from the decomposition, the names, the keys
// and the anchors is the caller's work, since only the caller knows which of those files it has.

import { faultInReadingStory, faultInStory } from '../../core/corpus/story.ts'
import type { Telling } from '../../core/corpus/story.ts'

// What a card teaches, in the words the reader meets: the parts of the character as this locale names
// them, in the order the drawing places them, what the character means, and the word its reading is
// bound to. `anchor` is null where no word has been found for that reading yet, and `reading` is null
// where the card teaches none.
export type Card = {
  readonly parts: readonly string[]
  readonly key: string
  readonly anchor: string | null
  readonly reading: string | null
}

// The three texts written for one character: the story that walks its parts to what it means, the
// clause saying what the key does and does not cover, and the story that walks its scene to the
// reading. An empty string is a text not written rather than an empty one: nothing is owed until the
// generator runs.
export type Told = {
  readonly meaning: string
  readonly nuance: string
  readonly reading: string
}

// What is wrong with one character's texts against its card, or null. A text not written yet is not a
// fault, since nothing is owed until the generator runs. This is the one judgement: the report names
// what a locale has committed and the generator decides what it keeps of a batch, and the two reading
// the same function is what stops a paid story from being written and then named at fault.
export function faultInTold(told: Told, card: Card, telling: Telling): string | null {
  if (told.meaning !== '') {
    const fault = faultInStory({ text: told.meaning, parts: card.parts, key: card.key }, telling)

    if (fault !== null) return `meaning: ${fault}`
  }

  if (told.reading === '') return null
  if (card.anchor === null || card.reading === null) return 'reading: no anchor binds this reading yet'

  const heard = faultInReadingStory(
    {
      text: told.reading,
      anchor: card.anchor,
      reading: card.reading,
      cast: [...card.parts, card.key],
    },
    telling,
  )

  return heard === null ? null : `reading: ${heard}`
}

export function faultsInStories(
  written: ReadonlyMap<string, Told>,
  cards: ReadonlyMap<string, Card>,
  telling: Telling,
): readonly string[] {
  const faults: string[] = []

  for (const [character, story] of written) {
    const card = cards.get(character)

    if (card === undefined) {
      faults.push(`${character} is not a card this curriculum deals`)
      continue
    }

    const fault = faultInTold(story, card, telling)

    if (fault !== null) faults.push(`${character} ${fault}`)
  }

  return faults
}
