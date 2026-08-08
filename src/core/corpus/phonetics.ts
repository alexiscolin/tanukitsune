// The Japanese half of a sound anchor: what a reading is made of, counted the way Japanese counts and
// written the way a comparison can use.
//
// Everything that decides whether an anchor holds runs on these rather than on kana or on romaji: a
// check that compares spellings answers a question nobody asked, and the French side has its own
// pronunciation derived from a lexicon for the same reason.

export function moraeOf(_kana: string): readonly string[] {
  return []
}

export function phonemesOf(_kana: string): readonly string[] {
  return []
}
