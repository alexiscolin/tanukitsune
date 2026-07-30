---
status: accepted
date: 2026-07-30
revisit-when: wanakana publishes a major version, or a year passes with no release while a conversion defect stays open
revisit-where: https://github.com/WaniKani/WanaKana/releases
---

# The answer field converts romaji to kana itself

## Context

A reading is typed in kana, and the shortest path to kana on a keyboard that has none is the operating
system's input method editor. That path works and costs nothing to build, and it is what the review
flow assumed. It also asks a beginner to install a Japanese keyboard, switch to it for every reading
answer and switch back for every meaning answer, on the surface where the product is used most.

Two facts make the alternative concrete rather than speculative.
[Bunpro](https://community.bunpro.jp/t/bunpro-faq-frequently-asked-questions/876) converts in the
field and says so as a feature: no editor and no Japanese keyboard are needed to review. The library it
credits, [wanakana](https://github.com/WaniKani/WanaKana), is written and maintained by the team behind
WaniKani itself, which is where this product's users come from, so adopting it is parity with the typing
behaviour they already know rather than a new dialect.

## Options

Convert in the field with wanakana. Convert in the field with a romaji table written here. Keep the
operating system's editor as the only path.

For the wanakana case, two ways in: its own `bind()`, which attaches a listener and writes into the
element, or `toKana()` called from the field's change handler.

## Decision

**Convert in the field, with wanakana, called from the change handler over a buffer of what was
typed.** Its script predicates come from the same package for the same reason: `isKana` decides whether
an answer is a reading, and `isJapanese` decides whether an editor owns the text.

A romaji table written here is the option to argue against hardest, because it looks small. It is not
an algorithm, it is a specification: `n` against `nn` against `n'`, the small tsu a doubled consonant
produces, the prolonged sound mark, `ヴ`, `ぢ` against `じ`, `ふぁ`, and the small kana combinations.
The library's `IMEMode` option, which takes `false`, `true`, `'toHiragana'` or `'toKatakana'`, exists to
hold an ambiguous trailing `n` as `n` until the next keystroke decides it, which is the case a table
written from memory gets wrong first. **That option is not used, and the reason is the same class of
case.** Measured against the library both ways, it reads a doubled `n` as `ん` alone, so `tennou` becomes
てんおう where the plain parse gives てんのう, and `konnichi` becomes こんいち against こんにち. Both are
valid kana, so nothing downstream can catch them and the reader loses the item. What the field does
instead is keep what was typed and reparse it plainly on every keystroke, which costs a lone `n` showing
as `ん` one keystroke early and corrects itself when a vowel follows. Script detection is the same shape once written honestly: the
prolonged sound mark lives in the katakana block and is used with hiragana, the iteration mark, the
half-width kana and the combining voice marks all belong to it. A predicate next to a library that
exports one would also be a second way to answer one question, which this repository does not allow.

`bind()` is refused. It writes into the element, which fights a controlled field and puts a second
writer beside the submission gate. `toKana()` called from the field keeps one writer: from the change
handler while the caret is at the end, since writing a converted string back drops the caret to the end
of it and a correction made mid-answer must not send the next keystroke elsewhere, and once more on
Enter, which is the keystroke saying no other follows and therefore decides what a correction left
behind. Both calls read the buffer rather than the field, because the kana on screen cannot say what
produced it: `ん` on screen is one `n` or two, and only what was typed knows which.

What `bind()` also carried and is not replaced is its own caret bookkeeping, which converts only the
segment around the selection and restores it afterwards. Leaving a mid-answer correction as typed is the
cheaper half of that, and it is why the field converts on one condition rather than always.

**The composition gate stays**, and this decision does not touch it. A reader who keeps a Japanese
keyboard still composes, so Enter still has to confirm a conversion before it submits anything. The two
mechanisms answer different questions: what a keystroke becomes, and when text becomes an answer.

## Consequences

**The romaji the reader typed never reaches a review event, and that is permanent for every row written
this way.** Conversion happens keystroke by keystroke, so what a submission carries is already kana. A
second column would hold the same kana twice, and recovering the romaji would mean keeping what was
typed before conversion, which is a keystroke record under another name. Error analysis over romaji
typos is therefore not available, and the eval sets in `ai/evals/` measure kana answers.

`review_event.answer` holds the answer as submitted rather than a normalised form, for a reason that
stands on its own and is stated in [`../specs/v0.1.md`](../specs/v0.1.md): a normalised answer freezes
the rule that produced it, and the table is append-only. The judge cache keeps its own obligation
unchanged, in [`../framing.md`](../framing.md) under obligations.

A reading that cannot become kana is refused with a message rather than graded, which is a product rule
the predicates make cheap: a pasted kanji, a digit, and a consonant no vowel finished all land there.
Half-width kana does not, since the judge already folds it and a message in front of it would name a
problem the reader does not have.
Well-formed romaji does not, because it converts on the way in and on Enter. The predicate asks for one
kana syllable rather than for kana alone, since the library counts the middle dot and the prolonged sound
mark as kana and a field holding only punctuation would otherwise be graded and cost an item its stage. **The refusal gates the field, before the cascade**, which has no
outcome for an answer that is not gradable and must not acquire one: a verdict is what it exists to
produce. Both land with the slice that installs the dependency, so until then a reading holding romaji
reaches no gate and would be graded as any other miss.

The dependency is installed with the slice that imports it, not now, because a dependency nothing
imports is one the dead-code gate is right to reject. It is MIT, has no runtime dependencies of its own
and ships types, so what it adds is bundle weight on the review route, measured in the build rather
than estimated here.
