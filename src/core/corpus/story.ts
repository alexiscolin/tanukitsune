// Whether a meaning story may stand for a character, judged on what the character is made of rather
// than on how it reads. A story is how a reader writes the character back: it walks the parts in the
// order the drawing places them and arrives at what the character means.
//
// It lives here for the reason `faultInAnchor` does. A rule stated in prose inside the asking and
// applied in code at the collecting drifts, and a drift nothing can reach is one found by paying for
// a batch.
//
// Nothing here knows French. What each part is called and what the character means arrive already
// resolved: this knows what to do about them.

export type Story = {
  readonly text: string
  // What the character is made of, named as this locale names it, in the order the drawing places
  // them. The order is the reader's eye, and it is what makes a story a way to write the character
  // rather than a list of its pieces.
  readonly parts: readonly string[]
  // What the character means, which is the answer the card asks for and so the last thing named.
  readonly key: string
  // What a name opens on in this locale, which is the locale's own material and arrives the way
  // `cannotStart` arrives in `anchor.ts`. A story says du passant where the name is le passant, so a
  // name is looked for without the article it was written with and found however the prose inflects it.
  readonly opensWith: readonly string[]
}

// A story says du passant where the name is le passant, so a name is looked for without the article it
// was written with and found however the prose inflects it.
function said(name: string, opensWith: readonly string[]): string {
  const opener = opensWith.find((one) => name.startsWith(one))

  return opener === undefined ? name : name.slice(opener.length)
}

export function faultInStory(story: Story): string | null {
  const { text, parts, key, opensWith } = story

  const told = text.trim()
  if (told === '') return 'no story at all'

  const bare = (name: string) => said(name, opensWith)

  // Where each name is said, and nothing about how often: a story naming a part twice has named it,
  // and the first mention is the one the order is read on.
  let reached = -1
  let last = ''

  for (const part of parts) {
    const at = told.indexOf(bare(part))

    if (at === -1) return `names nothing for ${part}`
    if (at < reached) return `names ${part} before ${last}`

    reached = at
    last = part
  }

  const ends = told.indexOf(bare(key))
  if (ends === -1) return `names nothing for ${key}`
  if (ends < reached) return `ends on something other than ${key}`

  return null
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
  readonly opensWith: readonly string[]
}

export function faultInReadingStory(story: ReadingStory): string | null {
  const { text, anchor, reading, cast, opensWith } = story

  const told = text.trim()
  if (told === '') return 'no story at all'

  const opens = told.indexOf(said(anchor, opensWith))
  if (opens === -1) return `names nothing for ${anchor}`

  const early = cast.find((one) => {
    const at = told.indexOf(said(one, opensWith))

    return at !== -1 && at < opens
  })
  if (early !== undefined) return `names ${early} before the anchor`

  if (!cast.some((one) => told.includes(said(one, opensWith)))) {
    return 'continues nothing the meaning story built'
  }

  const ends = told.indexOf(reading)
  if (ends === -1) return `names nothing for ${reading}`
  if (ends < opens) return 'runs from the reading to the anchor'

  return null
}
