// What a word of the curriculum means here, decided rather than fetched. The reading of a release is in
// `jmdict.ts`; this is what is done with what it read, and it lives here rather than in the command
// because `vitest` reads `src/` and a rule nothing exercises is a rule nobody can rely on.

import { toRomaji } from 'wanakana'

// Compared without case or accent, since the course writes its meanings in English and a word carried
// into French unchanged is written with the accent French gives it: karate and karaté are one word.
export function flattened(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
}

// A word written with one character and meaning what that character means is taught by the word the
// character already carries, or one shape teaches two French words on two cards. Where the two
// disagree the word keeps its own: 天 the character is heaven and 天 the word is the heavens, and a
// card teaching the first for the second teaches the wrong one.
export function reusesItsCharacter(taught: readonly string[], character: readonly string[] | undefined): boolean {
  if (character === undefined) return false

  const said = new Set(taught.map(flattened))

  return character.some((one) => said.has(flattened(one)))
}

// A word whose every meaning is its own reading romanised is a name: the course teaches 瑛斗 as Eito
// because that is what it is called, not because 瑛 and 斗 say so. A name is the same word here, so it
// is derived from the reading rather than translated, and rather than copied from the course. Read only
// where a dictionary states nothing, since a borrowed word passes this test too and a release is what
// knows French writes it samouraï.
export function nameOf(taught: readonly string[], readings: readonly string[]): readonly string[] | null {
  const romanised = readings.map((one) => {
    const said = toRomaji(one)

    return said.charAt(0).toUpperCase() + said.slice(1)
  })
  const named = taught.length > 0 && taught.every((one) => romanised.some((said) => said.toLowerCase() === one.toLowerCase()))

  return named ? romanised : null
}

// The meaning a card shows leads and the rest follow it. A release orders its senses its own way, so
// 味噌 states the figurative sense before the paste, and a card showing the first would ask for a word
// nobody is taught.
export function shownFirst(stated: readonly string[], taught: readonly string[]): readonly string[] {
  const asked = new Set(taught.map(flattened))
  const first = stated.findIndex((one) => asked.has(flattened(one)))

  return first < 1 ? stated : [stated[first] as string, ...stated.filter((_, at) => at !== first)]
}
