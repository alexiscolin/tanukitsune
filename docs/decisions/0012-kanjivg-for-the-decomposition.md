---
status: accepted
date: 2026-08-08
---

# KanjiVG for the decomposition, and component names we write ourselves

## Context

A meaning mnemonic is built out of the parts of the character and names each one, so the corpus needs
two things settled before a word of it can be written: which components a kanji is made of, and what
each component is called.

Neither may come from WaniKani. Their [API documentation](https://docs.api.wanikani.com/) claims the
mnemonics, the hints and the relationships as their content, so their decomposition is theirs as much
as their prose is, and their
[radical names](https://knowledge.wanikani.com/wanikani/japanese/radical-names/) are their own
invention, stated as such on that page. The rule the JLPT mapping already follows decides the rest:
named and licensed, or not shipped.

## Options

**KanjiVG**, CC BY-SA 3.0, a nested tree carrying each component, its position in the character and
whether it is the radical. **The IDS databases**, from the CHISE project and its cjkvi-ids fork,
complete and structurally equivalent but GPL v2, a copyleft software licence pointed at whatever reads
it. **Unihan**, permissively licensed by Unicode and carrying no decomposition at all. **cjk-decomp**,
offered under six licences including MIT, with relation codes of its own. **KRADFILE**, from the
EDRDG, CC BY-SA 4.0 and built to drive a multi-radical lookup box rather than a mnemonic: it gives 愛
as four parts with no structure and decomposes 鳥 into itself.

For names, **Kanji Alive's radical table**, CC BY 4.0, is the only redistributable set that exists.

## Decision

KanjiVG for the decomposition, republished as part of our corpus under CC BY-SA 4.0, which its own
licence permits as a later version carrying the same elements. Component names are written here,
seeded by Kanji Alive's table wherever a traditional name exists so that a learner meets the real 部首
name where there is one.

Measured against the [2024-08-07 release](https://github.com/KanjiVG/kanjivg/releases) and KANJIDIC2
grades 1 to 8, which is the jouyou set, the 2136 characters Japan fixes as the ones taught in school
and the frame a complete curriculum eventually covers: all 2136 are present, 57 of them atomic, and
the rest carry their parts with a position. **The naming gap is what decides the second half of this record.** Those
decompositions use 855 distinct components once radical forms are folded onto their kanji through
Unicode's `EquivalentUnifiedIdeograph` mapping, of which 209 carry a name in Kanji Alive's table.
The remaining 646 have a name nowhere that permits redistribution, and 1272 groups across the set
carry no character at all. Naming a nameless cluster of strokes is authorship, which is exactly why
WaniKani's names belong to WaniKani, so several hundred French names are a deliverable of this project
rather than an import.

## Consequences

Four obligations, from the licence header inside KanjiVG's own data: attribute it in the decomposition
files we publish, link to kanjivg.tagaini.net inside the running application and not only in the
repository, state that the data was modified, since pruning and restructuring it is an adaptation, and
publish the decomposition under the same licence.

Share-alike reaches the decomposition we publish. It does not reach the application code, which the
licence has no clause to reach. Whether it reaches the French prose generated from it is the genuinely
uncertain question, and the answer taken here is to never have to win it: the decomposition ships as
its own artifact under CC BY-SA 4.0, the generated text is licensed separately and said to be, and a
licences file records the separation rather than leaving it implied. Anyone reading this before the
project matters commercially should have that separation reviewed by someone qualified, because it is
an interpretation and this record says so.

341 jouyou characters have at least one top-level group with no component identified, and 183 have one
with no position. **The model proposes everywhere, names and keys and anchors included; what it may
never do is decide in silence.** So a character whose decomposition the data does not state is
reported as such and generated from a reading the model proposes and the reader ratifies, never
generated as though the parts were known. The same rule covers a reading left with no anchor the
constraints accept, and a subject refused by a safety classifier: each one leaves the run with its
reason attached rather than with a weaker answer nobody was told about.

This settles the licence question standing open in [`README.md`](README.md). What stays open there is
narrower and is named in [`../framing.md`](../framing.md): whether the subject list itself may travel
in a public chunk.
