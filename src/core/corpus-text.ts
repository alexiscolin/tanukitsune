import type { Subject } from './subject.ts'

// What one card was written, keyed by the identifier the subject carries. Text rather than a number,
// because the table holding it is keyed that way for the reason its column says: WaniKani is one
// implementation of what a subject is called rather than the definition of it.
export type Written = { readonly nuance: string; readonly mnemonic: string }

// The deck as it was dealt, each subject carrying what the locale wrote for it. A subject the locale
// has nothing for keeps the nulls it arrived with: a card with no text is a card the reader still
// meets, since the question is asked either way.
export function withText(
  subjects: readonly Subject[],
  written: ReadonlyMap<string, Written>,
): readonly Subject[] {
  return subjects.map((subject) => {
    const text = written.get(String(subject.id))

    return text === undefined ? subject : { ...subject, nuance: text.nuance, mnemonic: text.mnemonic }
  })
}
