# The corpus

**What this is.** How the French layer is built, what is checked before anyone reads it, and what the
method does not claim. The sampling plan and the acceptance criteria live in
[`specs/v0.1.md`](specs/v0.1.md); the model, prompt and eval rules live in
[`ai-engineering.md`](ai-engineering.md); the decomposition source and its licence live in
[ADR 0012](decisions/0012-kanjivg-for-the-decomposition.md). This document owns the construction rules
and the checks.

## The one rule everything else follows

**What a table can decide, the table decides, and the model writes only prose.** The key, the
component names, the reading being taught and the sound anchor are settled before generation and
handed to the model. It invents the story and nothing else. Where settling one is a judgement rather
than a lookup, as with which of a character's meanings is its central one, a model is asked earlier and
for an order over what a dictionary already states, never for a word: an answer that is not a
reordering is refused, so the table still decides. Everything a model is allowed to choose it
chooses well most of the time, and the exceptions are permanent.

**And nothing is decided in silence.** A character the decomposition data cannot state, a reading left
with no anchor the constraints accept, an item refused three times: each leaves the run with its
reason attached, for the reader to rule on. The model proposes everywhere. It never quietly settles
for less.

## What a card carries

A fixed French key, one per subject and never two subjects for one key, plus the English key it stands
for. A nuance. A meaning mnemonic. A reading mnemonic where a reading is taught, which is kanji and
the vocabulary whose reading is not the one its kanji already gave. The reading itself, its anchor,
the anchor's phonemes as derived rather than as claimed, and the components the story names, in order.

The structured fields are not decoration: a check that has to recover the anchor from prose is a check
that breaks on the first sentence written differently.

The table holding them widens when the generator lands rather than now, per
[`specs/v0.1.md`](specs/v0.1.md): a column added before anything fills it is a shape nobody has
tested, and the migration belongs with the code that writes the rows.

## Where the material lives

**One machine, one folder of material per locale.** The pipeline is written once and takes the locale
as a parameter, because `corpus_entry` is keyed by subject and locale from its first migration and the
chunks are published per locale and level. What is language-specific is material rather than code: the
cast, the anchor table, the component names, the rubric text, the two or three examples, and the
labelled sample. Adding a language is a folder and a locale entry, never a second pipeline.

The checks are written once and run against whichever folder they are given, so a language added is
covered the day it arrives rather than the day someone remembers it.

**No rule under `src/core/corpus/` is about one language.** The rules there compare sounds, count
morae, name the parts a reader can picture and refuse an allocation that gives one cue two answers.
Japanese is written into them, being the language taught and therefore constant, and the table of
sounds they compare against is the IPA, which every language draws from and none owns. What a particular language can and
cannot do is material, and a locale is the folder holding it: `naming.json` says what shape a name
takes in that language, `components.json` what it calls each component, `phonology.json` the sounds it
cannot begin a word with, `keys.json` the word each character is taught under, `key-choice.json` the
order a run settled over a character's glosses and `key-translation.json` the words carried across
where the release glosses none. The anchors and the cast land beside them. The first three are written
by hand and seed the folder; the last three a command writes, and each says which file it needs when
it is missing rather than guessing at one. A second language is those files and no code, which is the test to apply to anything
added here: if German would need a branch, it belongs in the folder rather than in the engine.

The decomposition is the neutral half and lives in `corpus/decomposition.json`, one line per character
so a diff names what moved, written by `pnpm corpus:decomposition` from the pinned release and
carrying its attribution in its own header, since the obligation follows the file rather than the
repository. Everything else under `corpus/` belongs to a locale.

## The world

**Keys.** KANJIDIC2 carries French glosses under a redistributable licence for the jouyou set, the
2136 characters taught in Japanese schools, so keys
are selected from an existing gloss and then made unique rather than invented from nothing. One key
per subject, one subject per key. The English the account grades on is not written beside it: it is
theirs, so it stays in the uncommitted inventory that already carries it, read at generation time like
the decomposition and never written into a file that travels.

**Which of a character's glosses is the central one is a judgement, and the only thing a model decides
about a key.** `corpus:key-choice` asks it to order the glosses, from the sense the character most
plainly carries to the one it carries least, and writes that order to `corpus/<locale>/key-choice.json`.
It writes no word: an answer that is not a reordering of the glosses it was given, one inventing,
dropping or repeating one, is refused and the release's own order stands. Selection and uniqueness stay
the table's, which is why only a character with more than one gloss is weighed at all. A
character nobody has weighed keeps the order the release states, so the keys can be written before a
single request is paid for.

`corpus:keys` writes them, in the order the reader meets the characters, so the plainest word goes to
the one taught first and a later character takes the next gloss it has. A character whose every gloss
is already spoken for is reported rather than given a word nobody wrote, and so is one the release does
not gloss at all, the two apart because one waits on a gloss and the other on a word to be freed.
Two shapes of gloss are cleaned before any of this: the Kangxi listing the release states as a meaning
of its own, "radical hameçon (no. 5)", which says where a character sits in a table rather than what it
means, and a parenthesised aside, which qualifies a gloss for a dictionary reader and means nothing on
a card. The word an aside qualifies is kept and the aside is not.

**Where the release leaves a character with no word this corpus can use, one is written for it.**
`corpus:key-translation` asks for it and writes it to `corpus/<locale>/key-translation.json`, which
`corpus:keys` reads after the character's own glosses rather than instead of them, so a character
reaches it only once its own are spent. Two cases arrive there: the release glosses the character in
this locale nowhere, and every gloss it does state already answers for somebody else. Selection and
uniqueness are unchanged by either.

This is the one place a word is not lifted out of a dictionary, and it is the price of the rule that no
character goes without: 154 of the 2101 French keys are written here rather than selected, which
`corpus/fr/keys.json` states in its own header, since the release's licence does not cover them. It is
still aimed at a stated meaning: what the course teaches is the target and the dictionary's English
settles the wording, the dictionary ordering its English by the classical Chinese sense and stating
truth before abandon for 諦 where the course teaches give up. The words already written travel with the
request, two characters answering to one word being impossible to tell apart. A word the locale cannot
write is refused by the shape rules a name answers to, minus the article: a key is what the reader
types, so `lune` passes where `la lune` would not.

**A character left with no word takes one back.** Whoever ends the walk unsettled takes a gloss from
whoever holds it, and that holder steps to another it has free, so one key moves rather than the order
of the whole curriculum. The shapes stories are built from go first, a shape being met inside every
character containing it while a leaf kanji is met once: 言 states dire and nothing else, and a character
taught earlier would otherwise leave a shape 193 characters are built from with nothing to be called.
Being asked first buys a word rather than a particular one, since a later rescue can take back what an
earlier one settled. Nobody is left out, a card nobody can be graded on being worse than a card on its
second choice.

Against the 2101 kanji the curriculum deals rather than the jouyou set the licence covers, French now
leaves none unsettled. A language the release does not carry reaches the same place by the same path,
every one of its characters having its word written rather than selected.

**Component names.** Written here, one name per component and one component per name across the whole
corpus, which is the single most valuable consistency rule at scale. Kanji Alive's table gives 209 of
the 855 components the jouyou decompositions use, so the rest are ours, seeded by the traditional name
wherever one exists so a learner meets the real 部首 name where there is one. The counts and their
measurement are in [ADR 0012](decisions/0012-kanjivg-for-the-decomposition.md).

A name opens on a definite article, because that is what makes it a thing rather than a description,
and it runs no further than a clause can carry. What opens one, what letters it may hold and how far
it may run are the language's own material, in `corpus/fr/naming.json`, since a second language brings
different answers and no code.

**A component sharing its shape with a kanji is named by that kanji's key**, and only a component no
kanji writes is named on its own. One shape teaches one French word, so a component named apart from
the kanji it doubles would put a second word on the same drawing, one on each card, and a story naming
the part would contradict the card teaching the character. Which components those are is a table
decision and never a model one: the model is not asked, so no answer of its has to be caught. What is
left for a model is what `corpus:report` counts as unnamed and `corpus:name` asks for, which is nothing
today: every component the curriculum deals carries a word, its own or its kanji's.

**Nine shapes are named apart from their kanji, because that kanji's key cannot be pictured**: 一 le
sol, 十 la croix, 又 la main droite, 乙 le cygne, 氏 la bannière, 非 les persiennes, 示 l'offrande, 各 la
halte and 也 le serpent. Each stands against a key that is a number, a pronoun, an adverb or a verb,
and the keys themselves are in `corpus/fr/keys.json` rather than repeated here, a selection being
allowed to move under a run while the nine are not. They are the whole of the exception, so the report
line counting names written on a shape a kanji writes reads nine, and a tenth is a new one to answer
for.

**A shape can fall between the two rules and be taught under no word at all**, being owed no name
because a kanji writes it while that kanji was left without a key because every gloss it has was
already spoken for. `corpus:report` counts those on their own line, and it is the one hole neither the
owed count nor the collision check can see. None stands there, every character the curriculum deals
having a word since a word is written for whoever the release leaves without one.

**A component the curriculum draws rather than writes is named from its shape, never from theirs.**
Nineteen of their 504 components carry no character and fifteen of those are still dealt, so nothing
here can name them by form alone. Their
artwork is theirs and their terms forbid reproducing it, so it is not fetched, not stored and not read:
the shape is taken from the characters that contain the component, and the name is written here. Where
their own name is the obvious description of a shape, coinciding with it is a fact and costs nothing;
where it is an invention, ours is something else.

**Which parts get named at all comes from the curriculum**, per
[ADR 0013](decisions/0013-the-curriculum-decides-the-parts.md): a story names the components the reader
has been dealt a card for, so nothing in it is a shape nobody has met. The drawing is asked where each
part sits, since the curriculum does not say and a part placed in the wrong half of a character
describes a different character. Where the curriculum decomposes nothing, the depth rule below takes
over: it keeps a part the locale can name and opens one it cannot, down to what the reader can picture.

**Anchors.** Each reading is bound to one French sound anchor, and every mnemonic teaching that
reading uses it. WaniKani holds the same policy and rewrites the whole affected set when an anchor
changes, which is the cost of not deciding early.

**Anchors are allocated across the whole curriculum before any prose exists, not level by level.**
On'yomi are short and massively homophonous, so a reading like こう is shared by dozens of characters,
and an anchor spent at level 3 is an anchor missing at level 40. Allocation is a calculation over
data, so it costs no model call and it is done once for all sixty levels; only the levels being
shipped are written. Candidates come from Lexique, which carries phonemic transcription and frequency
for French. Readings are served scarcest first, the one with two acceptable words before the one with
ten, since a common word spent on an easy reading leaves the scarce one with nothing and a reading with
no anchor is a card that cannot be written. Among the words the rules accept for a reading, the nearest
in sound takes it; where two
sit equally near, the word the reader can picture takes it; where nothing separates them there either,
the more ordinary word does. A reading left without leaves the run with the reason, either that no
word the rules accept exists for it, or that every one that does is already an anchor elsewhere or
sits too near one.

## How one item is made

The order matters as much as the rules.

**Generate by reading cluster, not by level.** Subjects sharing a reading are written together so the
sibling anchors are visible at the moment of writing. That is what stops two こう from sounding alike.

**Overgenerate and rank.** Several candidates per item, ranked on measurable properties, beats one
attempt judged afterwards, and it is what the published systems doing this task do.

**Follow the curriculum order.** Component names first, then kanji, then vocabulary, because a
mnemonic may only name what the learner has already met. A component carries a name and a meaning and
never a reading, since it is not pronounced. A kanji carries both. A vocabulary item composes its
meaning from the meanings of its kanji and earns a reading mnemonic only where its reading is not the
one its kanji already taught, and a kana-only word runs from the sound to the meaning instead, having
no kanji to rest on.

**Our components are the curriculum's, under our own names.** The parts a story names are the
components the curriculum teaches, so every one of them is a card the reader has been dealt, and those
cards teach our French names rather than the source's, which are theirs and may not be used. Where the
curriculum decomposes nothing, a story may still reach a part no card teaches: it introduces it in the
same sentence that uses it, one clause saying what it is before it is put to work.

**Few examples and positive instruction**, per [`ai-engineering.md`](ai-engineering.md): more than two
examples and every mnemonic starts to sound like the examples, and a long list of prohibitions dilutes
the instruction that matters.

## What makes a mnemonic good

**Meaning.** The story names each component, in the order they occur in the character, ends on the
key, and holds one interaction rather than a scene of many. Concrete nouns that can be pictured. No
clause that carries neither a component nor the key, because elaboration helps only where it makes the
link precise.

**Reading.** The same scene continues, with the same cast, so the character recalls one scene carrying
both answers. The anchor sits at the front, where the acoustic link of the keyword method attaches,
and the mnemonic runs from the anchor to the reading, the direction in which the item is asked.

**Tone.** Funny rather than strange, one interaction rather than a firework, plain register. Humour is
what mediates the delayed benefit; bizarreness is not, and it is capped rather than encouraged. The
reasoning is in [`sources.md`](sources.md) under the corpus, and it is a deliberate divergence from
the advice WaniKani gives its own readers.

## What is checked

Three families, run in cost order, and this section describes the whole set rather than what runs
today: the rules that judge a sound anchor and an allocation are written and tested, and the command
that puts them in front of a generated card arrives with the generator.

Deterministic first, because it costs nothing and catches the two
failures that actually harm a learner: a wrong reading taught, and a sound association that does not
hold in French.

**Per item, against ground truth.** The reading taught exists for this subject in KANJIDIC2 and is of
the type claimed. Romaji is derived from kana by our converter and never written by the model. Every
component named belongs to the decomposition and every component of the decomposition is used. Where
the story places components in space, that geography matches the positions KanjiVG records. The French
key is consistent with the gloss set, and the English key it claims is one the account accepts, a
check that runs at generation and whose verdict travels rather than the upstream text.

**Per item, against French.** The anchor is a real word, present in Lexique. Its phonemes are derived
and compared against what the model claimed, since a mismatch is a hallucinated pronunciation and is
measurable. The distance between anchor and reading is computed over articulatory features. The first
mora aligns in onset and nucleus. The mora count is preserved, which is what stops ちょう collapsing
onto ちょ. A hand-held table names the impossible onsets: French has no /h/ phoneme, so an anchor
claiming that ho sounds like hôtel is claiming a consonant that is not pronounced, and that table is
where judgement lives rather than in a linter.

**Per corpus.** One anchor per reading and one reading per anchor. A cap on how many subjects share an
anchor lemma. A minimum phonetic distance between anchors inside a homophone cluster, and a minimum
semantic distance between the keys of visually confusable characters. One name per component. No
reference to a subject introduced later, checked against the subject list as read, whose version is
recorded because the upstream order is theirs to change, with a component introduced in the clause
that uses it as the one accepted exception. Dependency depth of one: a mnemonic rests on
primitives, never on another mnemonic's text. And near-duplicate detection, because independent
generation converges.

**The expert reading.** A subagent reads what survived, as someone who knows how memory works, one
lens per call and a written rule per lens: one interaction, precise elaboration, imageability, cue
distinctiveness read over the whole batch rather than the item, encoding matched to how the item is
tested, the bizarreness ceiling, autonomy from other items, fidelity to the character, register and
safety, and whether the mnemonic can be dropped once the answer is known. Binary answers with the
offending span quoted and the rule named, never a score out of ten, which is stable, plausible and
unarguable. Three samples and a majority with the options shuffled, because pointwise rubric grading
carries position bias, which [`sources.md`](sources.md) records. A different model family from the
generator, since a model rates its own family's output higher. And no gate until its verdicts have
been compared to the reader's own labels, so the reading arrives with the labelling that makes that
comparison possible. Until then, what absorbs a mediocre first run is the budget of three, a coarser
instrument over a sample.

## The command

One command, the locale as a parameter, re-runnable by reflex. Seven of its steps exist today,
`corpus:decomposition`, `corpus:inventory`, `corpus:keys`, `corpus:key-choice`,
`corpus:key-translation`, `corpus:report` and `corpus:name`; the prose itself is the
shape the rest of this section describes and the next thing built, so nothing here is runnable end to
end yet.

It reads the subject list and takes the item count from it rather than from an estimate, generates
through the batch API, validates, writes by subject as it goes, publishes the chunks and then the
manifest in that order, and ends on the coverage report. A run killed halfway resumes: what is written
is not regenerated, and the failed set goes into the next batch, which is the same mechanism.

Batch submission is asynchronous, so one command does not mean one minute. The first run on a new
language builds that language's world, stops, and waits for it to be reviewed and committed.

`corpus:name` is that first run, and it is the shape the rest of the command takes. It counts what the
locale owes against the curriculum, asks for one name per component, and is re-run rather than waited
on: the first invocation submits and writes down the batch, a later one collects it and writes the
names it judged acceptable. A name refused for its shape or for belonging to another component is not
written, and the next run asks for it again alongside the requests the batch could not answer at all.
It takes a bound as a second parameter, so a run can be read by hand before the rest is paid for.

**Coverage is proven against the curriculum rather than against the decomposition.**
`pnpm corpus:inventory` writes down every subject the account deals up to a level, read with the
reader's own token. That file is never committed: it carries their meanings and their identifiers,
which stay on the machine that generated. It answers two questions nothing else can. Whether every
subject a session can show has a card, which is what a gap in coverage looks like from the reader's
side. And whether our key means what the account accepts for that subject, since the upstream grading
is in English and a French key that stands for something else would teach a character twice.

## What the reader still does

The acceptance sample, which [`specs/v0.1.md`](specs/v0.1.md) fixes at 150 items with one defect
accepted, read by hand. The checks above do not replace that reading; they make sure what reaches it
is not a first draft.

And, once a model grades answers, the labelling that calibrates it. The protocol is the
single-labeller one in [`ai-engineering.md`](ai-engineering.md): label first, with the exact rubric
text the judge will see, then re-label fifty cases blind at least a week later. That self-agreement is
the ceiling, and no judge score above it means anything.

## What this does not claim

No check measures whether a mnemonic will be remembered. The checks measure properties the evidence
associates with retention, which is a different thing and a weaker one.

The study closest to this product, on imagery mnemonics for Chinese characters, found no advantage
beyond immediate recall at two days and one week. What is defensible is that a well-chosen, concrete,
interactive mnemonic buys faster initial acquisition and a higher first-retrieval success rate, and
that spaced retrieval does the rest. The number that will settle it here is the proportion of first
retrievals answered correctly, per item, computed from `review_event` once the corpus is in use, and
that number is also the regeneration list.
