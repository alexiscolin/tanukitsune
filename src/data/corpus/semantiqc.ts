// SemantiQc rates how strongly a French word is seen, from 0 to 100, for 3596 words rated by 304
// speakers. Lexique states sounds and frequency and nothing about what a word calls to mind, and that
// is the property the keyword method rests on: the method works for words a reader can picture and
// does nothing for the others.
//
// One tab-separated row per word. The spread, the raters and their response times are stated beside
// the mean and none of them is taken. The publication and the licence are in docs/sources.md.

export function parseImagery(tsv: string): ReadonlyMap<string, number> {
  const [header, ...rows] = tsv.split('\n')
  const columns = (header ?? '').split('\t')
  const at = (name: string) => {
    const found = columns.indexOf(name)
    if (found === -1) throw new Error(`SemantiQc states no ${name} column. Its header reads ${columns.join(', ')}`)

    return found
  }
  const [word, seen] = [at('word_name'), at('mean_word')]

  const rated = new Map<string, number>()

  for (const row of rows) {
    const fields = row.split('\t')
    const text = fields[word]
    const rating = Number(fields[seen])
    if (text === undefined || text === '' || Number.isNaN(rating)) continue

    rated.set(text, rating)
  }

  return rated
}
