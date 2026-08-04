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
  // Client-generated, because the row is written offline where nothing can allocate one, and
  // because it is what makes replaying a sync safe.
  id: text('id').primaryKey(),
  // Text for the reason `corpus_entry` gives beside the same column, and so the two join: their
  // identifiers are one implementation of what a subject is called, not the definition of it.
  subjectId: text('subject_id').notNull(),
  // Which reference the answer was graded against. The table is append-only, so a verdict whose
  // reference cannot be identified is a labelled case that can never be replayed.
  locale: text('locale').notNull(),
  corpusVersion: text('corpus_version'),
  // The device clock, the only one available offline. A receipt time stamped server-side beside
  // it is what makes an implausible interval detectable rather than fed to FSRS as fact.
  answeredAt: timestamp('answered_at', { withTimezone: true }).notNull(),
  kind: text('kind').notNull(),
  // As submitted, before the normalisation each tier applies for its own comparison: a
  // normalised answer freezes the rule that produced it, and on an append-only table that means
  // the case can no longer be re-graded the day that rule changes.
  answer: text('answer'),
  verdict: text('verdict'),
  // Which tier decided, carrying its own version, which is what makes the v0.2 measurement of
  // the grader possible: a verdict with nobody behind it labels nothing.
  decidedBy: text('decided_by'),
  // What counts, which is the reader's ruling and not the cascade's.
  correct: boolean('correct').notNull(),
  // What the reader said instead, null where they said nothing else. That pair is the labelled
  // disagreement every later eval rests on, and it cannot be reconstructed after the fact.
  overriddenTo: text('overridden_to'),
  // Three saying how the answer was produced rather than what it was, present from the first
  // migration because a column absent when a row is appended cannot be filled afterwards. No
  // writer for the last two until v0.1.1.
  overrideReason: text('override_reason'),
  assist: text('assist'),
  scheduled: text('scheduled'),
  srsStageBefore: integer('srs_stage_before'),
  // The three the flush fills, and the only ones writable after the append. The stage comes back
  // in the source's response and is never computed locally, so it cannot exist before then.
  srsStageAfter: integer('srs_stage_after'),
  appliedUpstream: boolean('applied_upstream'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
})
