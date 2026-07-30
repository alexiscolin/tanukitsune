type EnterPress = {
  readonly isComposing: boolean
  readonly pressedAt: number
}

// One keystroke owns both the end of a composition and the keydown that ended it,
// so those two events share a task and their timestamps sit microseconds apart.
// Picking a candidate by tap and then reaching for the return key is two gestures,
// and no hand produces the second one this fast.
const ONE_KEYSTROKE_MS = 30

// Two signals decide, because there are two event orderings and no engine offers
// both. Chrome and Android raise the flag on the keydown that confirms a
// conversion. Safari ends the composition first, so by the time that same keydown
// arrives the flag is already down and only the timestamps still say what
// happened.
//
// The confirmation is then consumed, whichever way the press was decided: one
// conversion swallows exactly one Enter, which is what leaves the window above
// covering nothing but a conversion committed with no keystroke at all. The caller
// holds the returned value and hands it back on the next press.
export function pressEnter(
  { isComposing, pressedAt }: EnterPress,
  compositionEndedAt: number | null,
): { readonly submits: boolean; readonly compositionEndedAt: number | null } {
  const withinOneKeystroke = compositionEndedAt !== null && pressedAt - compositionEndedAt <= ONE_KEYSTROKE_MS

  return { submits: !isComposing && !withinOneKeystroke, compositionEndedAt: null }
}
