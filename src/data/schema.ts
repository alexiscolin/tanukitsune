import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

// The generated French layer. Keyed by subject and locale from the first
// migration, so a second language is not a migration.
export const corpusEntry = pgTable(
  'corpus_entry',
  {
    subjectId: text('subject_id').notNull(),
    locale: text('locale').notNull(),
    meaning: text('meaning').notNull(),
    nuance: text('nuance').notNull(),
    mnemonic: text('mnemonic').notNull(),
    // The model identifier, which the AI Act transparency article requires us to
    // carry on every generated row.
    generatedBy: text('generated_by').notNull(),
    promptVersion: text('prompt_version').notNull(),
    corpusVersion: text('corpus_version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Subject and locale identify a row, so they are the key rather than a
    // unique index over a keyless table. `subject_id` stays text because
    // WaniKani is one implementation of KnowledgeSource, not the definition of
    // what an identifier looks like.
    primaryKey({ columns: [table.subjectId, table.locale] }),
    index('corpus_entry_locale_version').on(table.locale, table.corpusVersion),
  ],
)
