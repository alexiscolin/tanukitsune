// Whether a story may stand for a card, judged on what the character is made of and on the scene the
// reader was already given. A meaning story is how a reader writes the character back: it walks the
// parts in the order the drawing places them and arrives at what the character means. A reading story
// continues that same scene, opens on the word the reading is bound to and arrives at the reading.
//
// It lives here for the reason `faultInAnchor` does. A rule stated in prose inside the asking and
// applied in code at the collecting drifts, and a drift nothing can reach is one found by paying for
// a batch.
//
// Nothing here knows French. What each part is called, what the character means and what the language
// does to a name in a sentence all arrive as material, the way `cannotStart` arrives in `anchor.ts`.

// What the language says about its own names, which is everything the reading below needs and nothing
// about the language itself.
export type Telling = {
  // What a name opens on, which prose replaces: a story says du passant where the name is le passant.
  readonly opensWith: readonly string[]
  // The alphabet, which is what says where a word ends. Without it le sol is named by soleil and le pas
  // by every negation in the sentence.
  readonly letters: string
  // What prose may add to the end of a name and still be saying it: la corne is named by les cornes,
  // and un is not named by une, which is a different word rather than the same one inflected.
  readonly inflects: readonly string[]
}

export type Story = {
  readonly text: string
  // What the character is made of, named as this locale names it, in the order the drawing places
  // them. The order is the reader's eye, and it is what makes a story a way to write the character
  // rather than a list of its pieces.
  readonly parts: readonly string[]
  // What the character means, which is the answer the card asks for and so the last thing named.
  readonly key: string
}

export type ReadingStory = {
  readonly text: string
  // The French word the reading is bound to, which opens the story: the acoustic link of the keyword
  // method attaches at the front, so a scene reaching it later has put the link where the reader is no
  // longer listening for it.
  readonly anchor: string
  // The reading as the card asks it, which the story arrives at: the item is asked from the character
  // to its sound, and a story told backwards rehearses a recall nobody is asked for.
  readonly reading: string
  // Who the meaning story put on stage, its parts and its key. One scene carries both answers, so a
  // reading story sharing nobody with it is a second thing to remember rather than the same one.
  readonly cast: readonly string[]
}

// The letters a name is said on, or null. A name is looked for without the article it was written
// with, on a word boundary, and prose may inflect its end: what this refuses is the name buried inside
// a longer word. The span comes back rather than the index alone, because it is the letters the search
// matched and not the name as written that the next name must not claim again.
//
// `taken` is what other names have already claimed. Names are read longest first, so la main droite
// claims its own words and la main is not answered by them: one mention answers for one part.
function saidAt(name: string, told: string, telling: Telling, taken: readonly number[][]): number[] | null {
  const opener = telling.opensWith.find((one) => name.startsWith(one))
  const bare = opener === undefined ? name : name.slice(opener.length)
  const letter = (one: string | undefined) => one !== undefined && telling.letters.includes(one.toLowerCase())

  for (let at = told.indexOf(bare); at !== -1; at = told.indexOf(bare, at + 1)) {
    const ends = at + bare.length
    let after = ends

    while (letter(told[after])) after += 1

    if (letter(told[at - 1])) continue
    if (after > ends && !telling.inflects.includes(told.slice(ends, after))) continue
    if (taken.some(([from, to]) => at < (to as number) && (from as number) < after)) continue

    return [at, ends]
  }

  return null
}

// Every name of a story, placed in the text, longest first so a phrase claims its own words before the
// shorter name written inside it is looked for.
function placed(names: readonly string[], told: string, telling: Telling): ReadonlyMap<string, number> {
  const taken: number[][] = []
  const where = new Map<string, number>()

  for (const name of [...names].sort((one, two) => two.length - one.length)) {
    const span = saidAt(name, told, telling, taken)

    if (span !== null) taken.push(span)
    where.set(name, span === null ? -1 : (span[0] as number))
  }

  return where
}

export function faultInStory(story: Story, telling: Telling): string | null {
  const { text, parts, key } = story

  const told = text.trim()
  if (told === '') return 'no story at all'

  const where = placed([...parts, key], told, telling)

  let reached = -1
  let last = ''

  for (const part of parts) {
    const at = where.get(part) as number

    if (at === -1) return `names nothing for ${part}`
    if (at < reached) return `names ${part} before ${last}`

    reached = at
    last = part
  }

  const ends = where.get(key) as number
  if (ends === -1) return `names nothing for ${key}`
  if (ends < reached) return `ends on something other than ${key}`

  return null
}

export function faultInReadingStory(story: ReadingStory, telling: Telling): string | null {
  const { text, anchor, reading, cast } = story

  const told = text.trim()
  if (told === '') return 'no story at all'

  const where = placed([anchor, ...cast], told, telling)

  const opens = where.get(anchor) as number
  if (opens === -1) return `names nothing for ${anchor}`

  const early = cast.find((one) => {
    const at = where.get(one) as number

    return at !== -1 && at < opens
  })
  if (early !== undefined) return `names ${early} before the anchor`

  if (!cast.some((one) => (where.get(one) as number) !== -1)) {
    return 'continues nothing the meaning story built'
  }

  const ends = told.indexOf(reading)
  if (ends === -1) return `names nothing for ${reading}`
  if (ends < opens) return 'runs from the reading to the anchor'

  return null
}
