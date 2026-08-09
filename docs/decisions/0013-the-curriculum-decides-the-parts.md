---
status: accepted
date: 2026-08-08
---

# The curriculum decides which parts a mnemonic names

## Context

A meaning mnemonic names the parts of a character, and there are two answers to which parts those are.
The shape of the character, which [ADR 0012](0012-kanjivg-for-the-decomposition.md) takes from KanjiVG.
Or the components the curriculum itself teaches, which are the subjects the reader is dealt a card for
and answers on.

The two do not always agree. When they disagree, a story built on the shape names something the reader
has never been shown, and a card that teaches a part the stories never use is a card that teaches
nothing.

## Options

Keep the shape as the source and cover the difference by introducing an unmet part inside the sentence
that uses it. Or take the parts from the curriculum and keep the shape for what the curriculum does not
say.

## Decision

The parts come from the curriculum, read per subject from the reader's own account. The shape supplies
each part's position, which the curriculum does not carry, and covers the characters the curriculum
does not decompose.

Coverage then needs no argument: every subject a session deals has a card, and every part a card names
is a subject the reader has met. That is the property this record exists to buy.

## Consequences

**Their decomposition is theirs.** It is read at generation time from the account, it lives in a file
that is not committed, and it never reaches a published surface, which is the rule
[`../framing.md`](../framing.md) holds for anything a public chunk carries. What travels is our French
prose and our own names for the parts, and those are ours.

**The names stay ours.** Their radical names are their invention and 0012 does not stop applying: what
this record changes is which parts a story names, not what those parts are called.

**KanjiVG stays**, for the position of each part and for every character the curriculum does not
decompose, so its licence and the obligations in 0012 continue to hold on what we publish from it.

**A part the curriculum names and the shape does not carry has no position**, and some of their
components are drawings rather than characters. Those are reported with their reason rather than
guessed at, which is the same path a character whose decomposition cannot be stated already takes.

**Generation now depends on an account.** A corpus cannot be built from a clone alone, where before
the decomposition was enough. That is the price of the coverage, and the inventory file is what makes
it one command rather than a manual step.
