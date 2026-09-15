// What every tier compares on, in one place: the fuzzy tier is measured against the same folding the
// exact tier applies, and a second copy of it would be one tier judging a string the other never saw.

// Bounded at ヶ, the last katakana with a hiragana counterpart one fixed offset below.
// What that leaves out is deliberate: ヷ and its neighbours have none, and the prolonged
// sound mark separates two readings rather than two spellings of one.
const KATAKANA = /[ァ-ヶ]/g
const TO_HIRAGANA = 0x60

// What may sit here and why is tier 1 in docs/specs/v0.1.md. Case folding is a no-op on
// kana, so one path serves both answer kinds rather than a branch reading as a rule that
// is not one.
export function normalise(value: string): string {
  return value
    .trim()
    .normalize('NFKC')
    .replace(KATAKANA, (kana) => String.fromCharCode(kana.charCodeAt(0) - TO_HIRAGANA))
    .toLowerCase()
}
