import { isKana, toKana } from 'wanakana'

const KANA_SYLLABLE = /[ぁ-ゖァ-ヶ]/u

// Whether what was typed is a reading at all. Kana and nothing else, and at least one syllable
// among them: a lone prolongation mark passes `isKana` and is not a reading.
export function isReading(answer: string): boolean {
  const composed = answer.normalize('NFKC')

  return isKana(composed) && KANA_SYLLABLE.test(composed)
}

// Romaji becoming kana as it is typed, and only while the caret sits at the end: converting
// behind the caret would rewrite what the reader came back to correct. The buffer keeps the
// latin the reader actually pressed, since kana cannot be turned back into it.
export function convertReading(buffer: string, next: string, shown: string, atEnd: boolean) {
  const grown = atEnd && next.startsWith(shown) ? buffer + next.slice(shown.length) : next

  return { buffer: grown, value: atEnd ? toKana(grown) : next }
}
