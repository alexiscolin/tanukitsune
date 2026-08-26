import { boolean, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

// The generated French layer. Keyed by subject and locale from the first
// migration, so a second language is not a migration.
export const corpusEntry = pgTable(
  'corpus_entry',
  {
    subjectId: text('subject_id').notNull(),
    locale: text('locale').notNull(),
    meaning: text('meaning').notNull(),
    // The English key the French one stands for, which the account grades on. Selected at generation
    // from the release's own English rather than carried from the account, whose text is theirs.
    //
    // Empty where the account's own word for a subject is its own invention rather than a fact about
    // the character, which is every radical: theirs may not be published, so the French name stands for
    // a shape rather than for a word, and there is no English key for it to stand for.
    englishKey: text('english_key'),
    nuance: text('nuance').notNull(),
    // The meaning story. It keeps the name it was committed under: renaming it to say which of the two
    // it is would be clearer and would move a column every row already written is keyed on.
    mnemonic: text('mnemonic').notNull(),
    // The reading story, and what a check reads it against. Empty where the subject teaches no reading,
    // which is a component always and a word wherever its reading is the one its kanji already gave.
    readingMnemonic: text('reading_mnemonic'),
    reading: text('reading'),
    anchor: text('anchor'),
    // Derived from the locale's lexicon rather than from what anything claimed the word sounds like,
    // which is the cheapest hallucination in the pipeline to catch.
    anchorPhonemes: text('anchor_phonemes').array(),
    // The components the story names, in the order it names them, so a check reads them rather than
    // recovering them from a sentence.
    parts: text('parts').array().notNull().default([]),
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
  // The server's own clock beside the device's, which is what makes an implausible interval
  // detectable rather than fed to FSRS as fact: `answered_at` is the only clock available offline
  // and a device clock can be wrong. Defaulted rather than sent, a caller stamping its own receipt
  // being the thing this exists to check.
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  srsStageBefore: integer('srs_stage_before'),
  // The three the flush fills, nullable because the append happens offline and long before it.
  srsStageAfter: integer('srs_stage_after'),
  appliedUpstream: boolean('applied_upstream'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
})
