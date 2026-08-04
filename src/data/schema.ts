import { boolean, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

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

// One answer, durable. Append-only, never deleted, and backed up here because WaniKani discards
// review history: this is the only record of a review that will ever exist, which is what
// docs/decisions/0005-system-of-record-for-reviews.md decides and why.
//
// It mirrors `core/review/answer-record.ts` field for field, and a test holds the two together:
// the flush reads a row written offline and fills the last three columns, so a field on one side
// and not the other is a queue nothing can drain.
export const reviewEvent = pgTable('review_event', {
  id: text('id').primaryKey(),
  // Text for the reason `corpus_entry` gives beside the same column, and so the two join: their
  // identifiers are one implementation of what a subject is called, not the definition of it. The
  // queued row carries the number the source sent, so the flush writes it as text rather than the
  // column reading one back.
  subjectId: text('subject_id').notNull(),
  locale: text('locale').notNull(),
  corpusVersion: text('corpus_version'),
  answeredAt: timestamp('answered_at', { withTimezone: true }).notNull(),
  kind: text('kind').notNull(),
  answer: text('answer'),
  verdict: text('verdict'),
  decidedBy: text('decided_by'),
  correct: boolean('correct').notNull(),
  overriddenTo: text('overridden_to'),
  // Three with no writer for the last two until v0.1.1, and here from the first migration because
  // a column absent when a row is appended cannot be filled afterwards.
  overrideReason: text('override_reason'),
  assist: text('assist'),
  scheduled: text('scheduled'),
  srsStageBefore: integer('srs_stage_before'),
  // The three the flush fills, nullable because the append happens offline and long before it.
  srsStageAfter: integer('srs_stage_after'),
  appliedUpstream: boolean('applied_upstream'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
})
