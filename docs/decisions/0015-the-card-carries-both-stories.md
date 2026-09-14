---
status: accepted
date: 2026-09-14
---

# A card carries both stories, and `Subject` gained a field to hold the second

## Context

The corpus writes two stories for a kanji. The meaning story says what the character means and names
its parts in drawing order; the reading story says how it sounds and opens on the French word its
reading is bound to. `corpus:publish` writes both, and the table has held `reading_mnemonic` beside
`mnemonic` since its first migration.

Only one of them reached a reader. The read that joins a locale's text onto a dealt sitting selected
the meaning, the nuance and the meaning story, and `Subject` carried one `mnemonic` field with no room
for the other. Every reading story written for the locale sat in the table and was shown to nobody.

`Subject` is a committed interface, and this repository freezes those: a type signature that needs to
change is a stop, not an implementation detail. That rule is what this record exists to answer.

## Options

Reuse `mnemonic` and join the two stories into one string. Carry the reading story outside `Subject`,
in a map the screen reads beside it. Or add a field.

Joining them loses the distinction the card needs: the two are asked at different moments, and a
question about the reading must not show the meaning story above the answer. A map beside `Subject`
puts one subject's text in two places, which is the shape every other field was written to avoid.

## Decision

`Subject` carries `readingMnemonic`, absent where the subject teaches no reading and where the story is
not written yet, which is the same contract `mnemonic` already has. `Written` and the read that fills
it carry it too, and the card shows it under the meaning story rather than beside the readings: the two
are one scene with the same cast, and split across the card they read as two things to keep.

## Consequences

**The freeze held and was lifted deliberately.** The change was raised as a stop and ruled on rather
than taken. What the rule buys is that the ruling exists, not that the field never moves.

**A deck cached by an earlier build is discarded.** The local store version is bumped, because a held
deck written before this carries a `Subject` without the field and a screen reading one back finds
undefined where it checks for absent.

**A part is named in the locale too.** The same read now answers for the pieces a card lists, which
were arriving in the source's language under a French label. Those are subjects the sitting did not ask
for, so their text costs a second read after the subjects arrive.
