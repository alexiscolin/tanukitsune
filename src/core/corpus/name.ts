// What a component name has to be before anybody reads it, and the faults a single name can carry on
// its own. Whether two components ended up with the same name is a question about the whole set, and
// `collidingNames` in `decomposition.ts` answers it.
//
// No rule here is about one language. What opens a name, what letters it may carry and how long it may
// run are that language's own material, arriving the way `cannotStart` arrives in `anchor.ts`.

export type Shape = {
  // What a name may open on, which is what makes it a thing rather than a description.
  readonly opensWith: readonly string[]
  // The alphabet, and separately what holds two of its letters together. Two strings rather than one
  // pattern, so the material stays material and a name made of punctuation can be told from a name.
  readonly letters: string
  readonly joiners: string
  readonly mostWords: number
}

export type Fault = 'no article' | 'nothing after the article' | 'not the locale' | 'too long' | 'the character itself'

export function faultInName(name: string, character: string, shape: Shape): Fault | null {
  const written = name.trim()
  const opener = shape.opensWith.find((one) => written.startsWith(one))

  if (opener === undefined) return 'no article'

  const letters = new Set(shape.letters)
  const allowed = new Set([...shape.letters, ...shape.joiners])

  // Read in this order, because a name in another script has nothing after its article either, and
  // saying so would name the smaller fault and hide the one that matters.
  if ([...written.toLowerCase()].some((one) => !allowed.has(one))) return 'not the locale'

  // An article and nothing that can be read is what a model returns when it has nothing, and it reads
  // as a name until somebody opens the file.
  if (![...written.slice(opener.length).toLowerCase()].some((one) => letters.has(one))) {
    return 'nothing after the article'
  }
  if (written.split(' ').length > shape.mostWords) return 'too long'
  // A component the curriculum draws carries no character, so there is nothing to be equal to.
  if (character !== '' && written.includes(character)) return 'the character itself'

  return null
}
