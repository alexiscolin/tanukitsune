// Lexique states one tab-separated row per written form and grammatical category, so a form that is
// both a noun and a verb is stated twice. What the corpus takes from it is what a sound anchor is
// judged on: how the word sounds, how common it is, and what part of speech it is. The thirty-one
// other columns are read from nowhere.
//
// Columns are found by the name the header gives them rather than by position, since the release has
// gained columns between versions and a position read from an older one would silently read another
// column's values. The licence and the attribution it obliges are in docs/sources.md.

// The release writes its own phonemic code rather than the IPA, and the two disagree where it matters
// most: `@` is the nasal of "temps" where SAMPA reads that symbol as a schwa, and the schwa is `°`.
// Every symbol is one character, which is what lets a transcription be read one character at a time.
//
// All thirty-seven are carried, `G` and `x` included, which French borrows rather than owns. Whether a
// sound can be measured against a reading is the articulatory table's to say and it already says it,
// counting one it does not carry as far from everything as a sound can be. Dropped here instead, the
// word would leave the lexicon for every reader of it, including a check asking whether an anchor is a
// real French word, on a rule stated two layers from the table it appeals to.
const IPA: Readonly<Record<string, string>> = {
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g',
  f: 'f', v: 'v', s: 's', z: 'z', S: 'ʃ', Z: 'ʒ',
  m: 'm', n: 'n', N: 'ɲ', l: 'l', R: 'ʁ',
  j: 'j', w: 'w', '8': 'ɥ',
  i: 'i', y: 'y', u: 'u', e: 'e', E: 'ɛ', '2': 'ø', '9': 'œ',
  o: 'o', O: 'ɔ', a: 'a', '°': 'ə',
  '5': 'ɛ̃', '1': 'œ̃', '§': 'ɔ̃', '@': 'ɑ̃',
  G: 'ŋ', x: 'x',
}

export type Word = {
  readonly phonemes: readonly string[]
  readonly frequency: number
  readonly category: string
  // How strongly the word is seen, on the scale the rating source uses, from a source Lexique is not:
  // it states sounds and frequency and nothing about what a word calls to mind. Absent where nothing
  // rated the word, which is not the same as rated low.
  readonly imageability?: number
}

export function parseLexicon(tsv: string, rated: ReadonlyMap<string, number> = new Map()): ReadonlyMap<string, Word> {
  const [header, ...rows] = tsv.split('\n')
  const columns = (header ?? '').split('\t')
  const at = (name: string) => {
    const found = columns.indexOf(name)
    if (found === -1) throw new Error(`Lexique states no ${name} column. Its header reads ${columns.join(', ')}`)

    return found
  }
  const ortho = at('ortho')
  const phon = at('phon')
  const cgram = at('cgram')
  const frequency = at('freqfilms2')

  const said = new Map<string, Word>()

  for (const row of rows) {
    const fields = row.split('\t')
    const written = fields[ortho]
    const spoken = fields[phon]
    if (!written || !spoken) continue

    // A symbol the code does not state is the release saying something this cannot read, which is a
    // release that has changed rather than a word to leave out.
    const phonemes: string[] = []
    for (const symbol of spoken) {
      const sound = IPA[symbol]
      if (sound === undefined) throw new Error(`Lexique writes ${written} with ${symbol}, which its code does not state`)

      phonemes.push(sound)
    }

    const common = Number(fields[frequency])
    // How common a word is decides which reading takes a contested anchor, so the rarest row of a form
    // standing for it would spend an anchor the allocation believes to be cheap.
    if (Number.isNaN(common) || common <= (said.get(written)?.frequency ?? -1)) continue

    const seen = rated.get(written)
    said.set(written, {
      phonemes,
      frequency: common,
      category: fields[cgram] ?? '',
      ...(seen === undefined ? {} : { imageability: seen }),
    })
  }

  return said
}
