// Whether a word teaches a reading or rests on one the reader has already met.
//
// A card carries a reading mnemonic only where its reading is not the one its characters already
// taught, per docs/corpus.md. What a word rests on is the single reading the curriculum teaches each
// character under, not that character's whole set: a second reading of it is as new to the reader as
// any other sound, and the curriculum accepts several while teaching one.
//
// Two changes are patterns a reader meets as patterns rather than as readings, and a word showing one
// still rests on what it was taught. A reading loses its last mora to a held consonant where the next
// one begins with a stop, and a reading voices where it follows another. Both are stated as the forms
// a taught reading may take, since a word is read left to right and a form that fits is a form the
// reader can hear.

// Voicing pairs the language allows, which stop short of the whole syllabary: な and ま voice to
// nothing, and は has two, one voiced and one not.
const VOICED: Readonly<Record<string, string>> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
}

const HARDENED: Readonly<Record<string, string>> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' }

// The morae a reading may end on before a held consonant takes their place.
const HELD = 'つくちき'

// Katakana read as the hiragana the reading is written in. A word carries the two scripts and its
// reading is stated in one, so a comparison that does not fold them refuses every borrowed word.
function folded(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (kana) => String.fromCodePoint((kana.codePointAt(0) as number) - 0x60))
}

function formsOf(reading: string): readonly string[] {
  const forms = new Set([reading])
  const [first = '', ...rest] = [...reading]
  const tail = rest.join('')

  if (VOICED[first] !== undefined) forms.add(VOICED[first] + tail)
  if (HARDENED[first] !== undefined) forms.add(HARDENED[first] + tail)
  if (HELD.includes(reading.slice(-1))) forms.add(`${reading.slice(0, -1)}っ`)

  return [...forms]
}

export function restsOnItsKanji(word: string, reading: string, taught: ReadonlyMap<string, string>): boolean {
  const characters = [...word]
  const said = folded(reading)

  // A word dealt in kana alone rests on no character, and read as kana standing for themselves it
  // would rest on nothing and be called known. Its card runs from the sound to the meaning instead.
  if (!characters.some((character) => taught.has(character))) return false

  // Read left to right, taking each character's forms in turn. A character can be read several ways
  // in a word, so the walk goes back where a form that fit left the rest of the reading unaccounted
  // for: taking the first form that fits and stopping would call a word new on the strength of an
  // earlier choice rather than of what it teaches.
  const from = (index: number, at: number): boolean => {
    if (index === characters.length) return at === said.length

    const character = characters[index] as string
    const written = taught.get(character)
    const forms = written === undefined ? [folded(character)] : formsOf(written)

    return forms.some((form) => said.startsWith(form, at) && from(index + 1, at + form.length))
  }

  return from(0, 0)
}
