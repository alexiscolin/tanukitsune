'use client'

// Which of the two questions this is, and the only word on the screen: a character alone does
// not say whether it is its meaning or its reading that is being asked, and the answer to the
// wrong question is wrong for a reason the reader cannot see. Under the rule rather than over
// it, so the eye meets the character, then the empty line it has to fill, then what to fill it
// with. A real label rather than a description, so pressing it reaches the field.
//
// It goes once the answer has been judged: the question stops being asked at that moment and
// the sheet below now says what was wanted. Only its ink leaves, because the field still owes
// a screen reader its name.
export function AnswerLabel({
  htmlFor,
  label,
  judged,
}: {
  htmlFor: string
  label: string
  judged: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={
        judged ? 'sr-only' : 'eyebrow cursor-pointer text-[var(--color-brand)]'
      }
    >
      {label}
    </label>
  )
}
