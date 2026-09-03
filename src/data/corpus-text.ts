import 'server-only'

import { and, eq, inArray } from 'drizzle-orm'

import type { Written } from '@/core/corpus-text'
import type { Locale } from '@/core/locales'

import { db } from './db'
import { corpusEntry } from './schema'

// What a locale wrote for the subjects a sitting deals. The source sends the upstream curriculum and
// knows nothing of our corpus, so payload.ts leaves the two fields null and this is where they are
// read: once, on the server, so the sitting the device caches carries the text with it, which is what
// makes the card appear on a wrong answer with no network.

export async function textFor(
  ids: readonly number[],
  locale: Locale,
): Promise<ReadonlyMap<string, Written>> {
  if (ids.length === 0) return new Map()

  const rows = await (await db())
    .select({
      subjectId: corpusEntry.subjectId,
      nuance: corpusEntry.nuance,
      mnemonic: corpusEntry.mnemonic,
    })
    .from(corpusEntry)
    .where(and(eq(corpusEntry.locale, locale), inArray(corpusEntry.subjectId, ids.map(String))))

  return new Map(rows.map((row) => [row.subjectId, { nuance: row.nuance, mnemonic: row.mnemonic }]))
}
