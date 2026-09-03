import 'server-only'

import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import type { Locale } from '@/core/locales'
import type { Written } from '@/core/review/deck'

import { db } from './db'
import { corpusEntry } from './schema'

// What a locale wrote for the subjects a sitting deals. The source deals the upstream curriculum and
// knows nothing of our corpus, so payload.ts leaves both fields empty and this is where they are read.

// Keyed by number, the way unsentAnswers reads the same column: `subject_id` is text because WaniKani
// is one implementation of what a subject is called rather than the definition of it, and that is a
// fact about the table which nothing above this layer has to carry.
const rows = z.array(
  z.object({
    subjectId: z.coerce.number().int(),
    meaning: z.string(),
    nuance: z.string(),
    mnemonic: z.string(),
  }),
)

// A card shows a block or it does not, and the empty string the artifact uses for a text nobody has
// written yet is not a block. Turned here rather than in the screen: what a column holds is this
// layer's business, and above it a text is written or it is absent.
function told(text: string): string | null {
  return text.trim() === '' ? null : text
}

export async function textFor(
  ids: readonly number[],
  locale: Locale,
): Promise<ReadonlyMap<number, Written>> {
  const read = await (await db())
    .select({
      subjectId: corpusEntry.subjectId,
      meaning: corpusEntry.meaning,
      nuance: corpusEntry.nuance,
      mnemonic: corpusEntry.mnemonic,
    })
    .from(corpusEntry)
    .where(and(eq(corpusEntry.locale, locale), inArray(corpusEntry.subjectId, ids.map(String))))

  return new Map(
    rows.parse(read).map((row) => [
      row.subjectId,
      { meaning: row.meaning, nuance: told(row.nuance), mnemonic: told(row.mnemonic) },
    ]),
  )
}
