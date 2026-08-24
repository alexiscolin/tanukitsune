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
// Two of the release's thirty-seven are absent here. `G` is the /ŋ/ of "parking" and `x` the /x/ of a
// handful of Spanish loans, and the articulatory table those sounds would be measured against
// describes neither, French borrowing them rather than owning them.
const IPA: Readonly<Record<string, string>> = {
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g',
  f: 'f', v: 'v', s: 's', z: 'z', S: 'ʃ', Z: 'ʒ',
  m: 'm', n: 'n', N: 'ɲ', l: 'l', R: 'ʁ',
  j: 'j', w: 'w', '8': 'ɥ',
  i: 'i', y: 'y', u: 'u', e: 'e', E: 'ɛ', '2': 'ø', '9': 'œ',
  o: 'o', O: 'ɔ', a: 'a', '°': 'ə',
  '5': 'ɛ̃', '1': 'œ̃', '§': 'ɔ̃', '@': 'ɑ̃',
}

export type Word = {
  readonly phonemes: readonly string[]
  readonly frequency: number
  readonly category: string
}

export function parseLexicon(tsv: string): ReadonlyMap<string, Word> {
  const [header, ...rows] = tsv.split('\n')
  const columns = (header ?? '').split('\t')
  const at = (name: string) => {
    const found = columns.indexOf(name)
    if (found === -1) throw new Error(`Lexique states no ${name} column. Its header reads ${columns.join(', ')}`)

    return found
  }
  const [ortho, phon, cgram, frequency] = [at('ortho'), at('phon'), at('cgram'), at('freqfilms2')]

  const said = new Map<string, Word>()

  for (const row of rows) {
    const fields = row.split('\t')
    const written = fields[ortho]
    const spoken = fields[phon]
    if (written === undefined || written === '' || spoken === undefined || spoken === '') continue

    const phonemes = [...spoken].map((symbol) => IPA[symbol])
    // A word carrying a sound the rules cannot place is no candidate at all: kept, it would be
    // compared against a reading on a sound nothing describes, and the comparison would answer.
    if (phonemes.some((phoneme) => phoneme === undefined)) continue

    const common = Number(fields[frequency])
    // How common a word is decides which reading takes a contested anchor, so the rarest row of a form
    // standing for it would spend an anchor the allocation believes to be cheap.
    if (Number.isNaN(common) || common <= (said.get(written)?.frequency ?? -1)) continue

    said.set(written, { phonemes: phonemes as readonly string[], frequency: common, category: fields[cgram] ?? '' })
  }

  return said
}
