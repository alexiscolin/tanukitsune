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
  readonly by: readonly string[]
}

export type Unconfirmed = {
  readonly character: string
  readonly value: string
  readonly type: Reading['type'] | null
}

function taughtByCharacter(subjects: readonly InventorySubject[]): ReadonlyMap<string, string> {
  const taught = new Map<string, string>()

  for (const subject of subjects) {
    if (subject.type !== 'kanji' || subject.characters === null) continue

    const primary = subject.readings.find((reading) => reading.primary)
    if (primary !== undefined) taught.set(subject.characters, primary.value)
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
    if (subject.characters === null) continue

    for (const reading of subject.readings) {
      if (subject.type === 'kanji') {
        name(reading.value, reading.type as Named['type'], reading.primary, subject.characters)
        continue
      }

      if (!reading.primary) continue

      // A word earns a reading only where its reading is not the one its characters already taught,
      // and a word written in kana alone rests on no character, so it teaches its own sound.
      name(reading.value, null, !restsOnItsKanji(subject.characters, reading.value, taught), subject.characters)
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
    if (subject.type !== 'kanji' || subject.characters === null) continue

    const primary = subject.readings.find((reading) => reading.primary)
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
