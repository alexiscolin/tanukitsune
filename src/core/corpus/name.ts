// What a component name has to be before anybody reads it, and the faults a single name can carry on
// its own. Whether two components ended up with the same name is a question about the whole set, and
// `collidingNames` in `decomposition.ts` answers it.
//
// No rule here is about one language. What opens a name, what letters it may carry and how far it may
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

// The shape plus what only the asking needs: the language it is asked in and the examples it shows.
// Both are material for the same reason the shape is, and the prompt reads them from here.
export type Naming = Shape & {
  readonly language: string
  readonly examples: readonly { readonly character: string; readonly name: string }[]
}

export type Fault = 'no article' | 'nothing after the article' | 'not the locale' | 'too long'

export function faultInName(name: string, shape: Shape): Fault | null {
  const written = name.trim().toLowerCase()
  const opener = shape.opensWith.find((one) => written.startsWith(one))

  if (opener === undefined) return 'no article'

  // Read in this order, because a name in another script has nothing after its article either, and
  // saying so would name the smaller fault and hide the one that matters.
  if ([...written].some((one) => !shape.letters.includes(one) && !shape.joiners.includes(one))) {
    return 'not the locale'
  }

  // An article and nothing that can be read is what a model returns when it has nothing, and it reads
  // as a name until somebody opens the file.
  if (![...written.slice(opener.length)].some((one) => shape.letters.includes(one))) {
    return 'nothing after the article'
  }

  // Counted after the article, because le and l' are the same article and only one of them brings a
  // space, so counting the whole name makes the bound mean two different things.
  if (written.slice(opener.length).split(' ').length > shape.mostWords) return 'too long'

  return null
}
