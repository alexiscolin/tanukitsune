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
  z.object({ subjectId: z.coerce.number().int(), nuance: z.string(), mnemonic: z.string() }),
)

export async function textFor(
  ids: readonly number[],
  locale: Locale,
): Promise<ReadonlyMap<number, Written>> {
  const read = await (await db())
    .select({
      subjectId: corpusEntry.subjectId,
      nuance: corpusEntry.nuance,
      mnemonic: corpusEntry.mnemonic,
    })
    .from(corpusEntry)
    .where(and(eq(corpusEntry.locale, locale), inArray(corpusEntry.subjectId, ids.map(String))))

  return new Map(
    rows.parse(read).map((row) => [row.subjectId, { nuance: row.nuance, mnemonic: row.mnemonic }]),
  )
}
