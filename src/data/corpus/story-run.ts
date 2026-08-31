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

// The two stories written for one character. An empty string is a story not written rather than an
// empty one: nothing is owed until the generator runs.
export type Told = {
  readonly meaning: string
  readonly reading: string
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

    if (story.meaning !== '') {
      const fault = faultInStory({ text: story.meaning, parts: card.parts, key: card.key }, telling)

      if (fault !== null) faults.push(`${character} meaning: ${fault}`)
    }

    if (story.reading === '') continue

    if (card.anchor === null || card.reading === null) {
      faults.push(`${character} reading: no anchor binds this reading yet`)
      continue
    }

    const fault = faultInReadingStory(
      {
        text: story.reading,
        anchor: card.anchor,
        reading: card.reading,
        cast: [...card.parts, card.key],
      },
      telling,
    )

    if (fault !== null) faults.push(`${character} reading: ${fault}`)
  }

  return faults
}
