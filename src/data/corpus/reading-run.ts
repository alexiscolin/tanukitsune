// Every reading the curriculum names, settled in one pass: what type it is, whether a card teaches it
// or the account merely accepts it, and which subjects name it.
//
// Which reading a character is taught under comes from the curriculum and from nowhere else, the same
// decision docs/decisions/0013-the-curriculum-decides-the-parts.md takes for the parts: a release lists
// every reading a character has without saying which one the reader is shown. KANJIDIC2 verifies rather
// than states, and what it cannot confirm is reported rather than silently kept or silently dropped.
//
// A reading a card teaches is a reading the allocation owes an anchor. One the account accepts without
// teaching is carried marked, since a run that dropped it could not tell a reading it had never seen
// from one it had decided against.

import type { Reading } from './kanjidic.ts'
import type { InventorySubject } from './inventory.ts'
import { restsOnItsKanji } from '../../core/corpus/reading.ts'

export type Named = {
  // Absent on a word, the distinction between a Chinese and a Japanese reading belonging to the
  // character rather than to the word built from it.
  readonly type: Reading['type'] | null
  readonly taught: boolean
  // The characters naming it rather than the subjects, since a character and the word of that one
  // character are one shape a story names once, and what reads this reaches for a shape.
  readonly by: readonly string[]
}

export type Unconfirmed = {
  readonly character: string
  readonly value: string
  readonly type: Reading['type'] | null
}

// Content the source has withdrawn is dealt by no session, so a reading taught for it is an anchor owed
// to a card nobody can be shown. Skipped here as `curriculum.ts` and `taughtCharacters` already skip it.
function teaching(subject: InventorySubject) {
  return subject.type === 'kanji' && subject.characters !== null && !subject.hidden
    ? subject.readings.find((reading) => reading.primary)
    : undefined
}

function taughtByCharacter(subjects: readonly InventorySubject[]): ReadonlyMap<string, string> {
  const taught = new Map<string, string>()

  for (const subject of subjects) {
    const primary = teaching(subject)
    if (primary !== undefined) taught.set(subject.characters as string, primary.value)
  }

  return taught
}

export function readingsOf(subjects: readonly InventorySubject[]): ReadonlyMap<string, Named> {
  const taught = taughtByCharacter(subjects)
  const named = new Map<string, Named>()

  const name = (value: string, type: Named['type'], teaches: boolean, by: string) => {
    const before = named.get(value)
    // A reading one card teaches and another merely accepts is a reading taught, since one card owes
    // it an anchor and no card is served by the allocation skipping it.
    named.set(value, {
      type: before?.type ?? type,
      taught: (before?.taught ?? false) || teaches,
      by: before === undefined ? [by] : before.by.includes(by) ? before.by : [...before.by, by],
    })
  }

  for (const subject of subjects) {
    if (subject.characters === null || subject.hidden) continue

    // A word written in kana alone states no reading, the word being its own, so the curriculum leaves
    // the list empty. Read as it stands, sixty of them enter nothing and are owed no anchor, while the
    // rule says they run from the sound to the meaning and so teach a sound of their own.
    if (subject.type === 'kana_vocabulary' && subject.readings.length === 0) {
      name(subject.characters, null, true, subject.characters)
      continue
    }

    for (const reading of subject.readings) {
      if (subject.type === 'kanji') {
        name(reading.value, reading.type as Named['type'], reading.primary, subject.characters)
        continue
      }

      // A word earns a reading only where its reading is not the one its characters already taught,
      // and a word written in kana alone rests on no character, so it teaches its own sound. One the
      // account accepts without dealing it is carried marked, on the same terms as a character's: a
      // run that dropped it could not tell a reading it had never seen from one it decided against.
      const teaches = reading.primary && !restsOnItsKanji(subject.characters, reading.value, taught)
      name(reading.value, null, teaches, subject.characters)
    }
  }

  return named
}

export function unconfirmed(
  subjects: readonly InventorySubject[],
  stated: ReadonlyMap<string, readonly Reading[]>,
): readonly Unconfirmed[] {
  const found: Unconfirmed[] = []

  for (const subject of subjects) {
    if (subject.characters === null) continue

    const primary = teaching(subject)
    const says = stated.get(subject.characters)
    // A character the release states nowhere confirms nothing and denies nothing, and reporting it as
    // a reading taught wrongly would send a reader looking for a mistake that is not there.
    if (primary === undefined || says === undefined) continue

    if (!says.some((reading) => reading.value === primary.value && reading.type === primary.type)) {
      found.push({ character: subject.characters, value: primary.value, type: primary.type as Named['type'] })
    }
  }

  return found
}

// How many words rest on what their characters taught and how many teach a reading of their own. Said
// by the run because the documents quote both, and a total announced in prose that no command prints is
// a total nobody can check against the curriculum it claims to describe.
export function wordsResting(subjects: readonly InventorySubject[]): { readonly dealt: number; readonly resting: number } {
  const taught = taughtByCharacter(subjects)
  const words = subjects.filter(
    (one) => (one.type === 'vocabulary' || one.type === 'kana_vocabulary') && !one.hidden && one.characters !== null,
  )

  const resting = words.filter((one) => {
    const primary = one.readings.find((reading) => reading.primary)
    // A word stating no reading is its own, and a word is its own reading only where it rests on no
    // character: it teaches a sound rather than resting on one.
    if (primary === undefined) return false

    return restsOnItsKanji(one.characters as string, primary.value, taught)
  }).length

  return { dealt: words.length, resting }
}
