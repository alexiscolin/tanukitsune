---
status: accepted
date: 2026-07-30
revisit-when: WCAG 3.0 reaches Candidate Recommendation and states what a time limit owes the reader
revisit-where: https://www.w3.org/TR/wcag-3.0/
---

# A review timer, off until the reader turns it on

## Context

The review flow was specified without a timer, and the reason was WCAG 2.2.1: a self-imposed review
timer is not covered by the real-time exception, and adding timer control late is a data model change
rather than a styling one.

What is wanted is not that timer. It is a limit the reader sets for themselves, as a challenge, on a
product whose central rule is that a correct answer is never punished. That is a different mechanism
from the one refused, and the criterion answers it differently.

## Options

No timer at all. A timer on by default, carrying the three controls the criterion requires. A timer
that does not exist until the reader switches it on.

## Decision

**Off by default, switched on by the reader, with a duration they choose and one control that does
both.**

WCAG 2.2.1 is satisfied when at least one of turn off, adjust or extend holds for a time limit. A limit
existing only because it was switched on is turned off by the control that created it, and a duration
the reader sets is the adjustment, so two of the three hold by construction rather than by a feature
added beside the timer. Neither rests on the essential-activity exception, which is the argument a
challenge mode would otherwise need and is weaker for being a judgement rather than a mechanism.

**Expiry reveals the reference and asks the reader to grade, rather than failing the item.** A limit
that ran out says nothing about what they knew. An expiry that failed the item would also poison the
grading gate, which exists to measure the cascade against answers people meant.

**The expiry is recorded**, in `assist`, beside the hint rungs and the revealed reference, so an answer
produced under a limit is never counted as one given cold.

## Consequences

The timer is a setting, so it brings the first thing the product remembers about a reader. It is set
where the session starts, next to the session length, rather than in a settings screen that does not
exist, which keeps the surface at one screen instead of two.

A countdown is motion. It respects the reduced-motion preference and offers a form that does not
animate, because a limit whose display cannot be quietened is a second pressure under another name.

The default is unchanged: a reader who never opens the control reviews under no limit, which is what
the specification protected before the challenge existed and is why it stays the default rather than a
prohibition.

The claim that an opt-in limit satisfies the criterion is load-bearing, so it carries its source in
[`../sources.md`](../sources.md) rather than only here.
