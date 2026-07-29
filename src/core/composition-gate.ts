type EnterPress = {
  readonly isComposing: boolean
  readonly pressedAt: number
  readonly compositionEndedAt: number | null
}

// One keystroke owns both the end of a composition and the keydown that ended it,
// so those two events share a task and their timestamps sit microseconds apart.
// Picking a candidate by tap and then reaching for the return key is two gestures,
// and no hand produces the second one this fast.
const ONE_KEYSTROKE_MS = 30

// Two signals, because there are two event orderings and no engine offers both.
// Chrome and Android raise the flag on the keydown that confirms a conversion.
// Safari ends the composition first, so by the time that same keydown arrives the
// flag is already down and only the timestamps still say what happened.
export function enterSubmits({ isComposing, pressedAt, compositionEndedAt }: EnterPress): boolean {
  if (isComposing) return false
  if (compositionEndedAt === null) return true

  return pressedAt - compositionEndedAt > ONE_KEYSTROKE_MS
}
