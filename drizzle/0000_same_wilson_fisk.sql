CREATE TABLE "corpus_entry" (
	"subject_id" text NOT NULL,
	"locale" text NOT NULL,
	"meaning" text NOT NULL,
	"nuance" text NOT NULL,
	"mnemonic" text NOT NULL,
	"generated_by" text NOT NULL,
	"prompt_version" text NOT NULL,
	"corpus_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corpus_entry_subject_id_locale_pk" PRIMARY KEY("subject_id","locale")
);
--> statement-breakpoint
CREATE INDEX "corpus_entry_locale_version" ON "corpus_entry" USING btree ("locale","corpus_version");