ALTER TABLE "corpus_entry" ADD COLUMN "english_key" text;--> statement-breakpoint
ALTER TABLE "corpus_entry" ADD COLUMN "reading_mnemonic" text;--> statement-breakpoint
ALTER TABLE "corpus_entry" ADD COLUMN "reading" text;--> statement-breakpoint
ALTER TABLE "corpus_entry" ADD COLUMN "anchor" text;--> statement-breakpoint
ALTER TABLE "corpus_entry" ADD COLUMN "anchor_phonemes" text[];--> statement-breakpoint
ALTER TABLE "corpus_entry" ADD COLUMN "parts" text[] DEFAULT '{}' NOT NULL;